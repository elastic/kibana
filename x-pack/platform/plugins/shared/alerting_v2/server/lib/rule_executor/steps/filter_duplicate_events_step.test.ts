/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilterDuplicateEventsStep } from './filter_duplicate_events_step';
import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import { resolveRuleEventId } from '../build_alert_events';
import {
  collectStreamResults,
  createAlertEvent,
  createMockEsClient,
  createPipelineStream,
  createRulePipelineState,
  createRuleResponse,
} from '../test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';

const ELIGIBLE = { eligible: true, mvExpandFields: [] } as const;

const sourceRow = (id: string) => ({
  _id: id,
  _index: 'logs-000001',
  _version: 1,
  'host.name': 'a',
});

describe('FilterDuplicateEventsStep', () => {
  let step: FilterDuplicateEventsStep;
  let esClient: ReturnType<typeof createMockEsClient>;
  let loggerService: ReturnType<typeof createLoggerService>['loggerService'];
  let mockLogger: ReturnType<typeof createLoggerService>['mockLogger'];

  const mockExisting = (ids: string[]) => {
    esClient.search.mockResolvedValue({
      hits: { hits: ids.map((id) => ({ _id: id, _index: ALERT_EVENTS_DATA_STREAM })) },
    } as never);
  };

  beforeEach(() => {
    ({ loggerService, mockLogger } = createLoggerService());
    esClient = createMockEsClient();
    step = new FilterDuplicateEventsStep(esClient);
  });

  it('drops events whose deterministic id already exists and emits the deduplicated counter', async () => {
    const duplicate = createAlertEvent({ status: 'breached', data: sourceRow('doc-1') });
    const fresh = createAlertEvent({ status: 'breached', data: sourceRow('doc-2') });
    mockExisting([resolveRuleEventId(duplicate)!]);

    const state = createRulePipelineState({
      rule: createRuleResponse(),
      deduplication: ELIGIBLE,
      alertEventsBatch: [duplicate, fresh],
    });
    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(result).toEqual({
      type: 'continue',
      state: { ...state, alertEventsBatch: [fresh] },
      meta: { counters: { ruleEventsDeduplicated: 1 } },
    });
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: ALERT_EVENTS_DATA_STREAM,
        query: { ids: { values: [resolveRuleEventId(duplicate), resolveRuleEventId(fresh)] } },
        _source: false,
      })
    );
  });

  it('passes the batch through without querying when the run is not eligible', async () => {
    const event = createAlertEvent({ status: 'breached', data: sourceRow('doc-1') });
    mockExisting([resolveRuleEventId(event)!]);

    const state = createRulePipelineState({
      rule: createRuleResponse(),
      deduplication: { eligible: false, mvExpandFields: [] },
      alertEventsBatch: [event],
    });
    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(result).toEqual({ type: 'continue', state });
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('never drops events without a source _id (recovered, no_data, aggregating rows)', async () => {
    const recovered = createAlertEvent({ status: 'recovered', data: {} });
    const noData = createAlertEvent({ status: 'no_data', data: {} });
    const aggregated = createAlertEvent({
      status: 'breached',
      data: { 'host.name': 'a', count: 3 },
    });

    const state = createRulePipelineState({
      rule: createRuleResponse(),
      deduplication: ELIGIBLE,
      alertEventsBatch: [recovered, noData, aggregated],
    });
    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(result.state).toBe(state);
    expect(esClient.search).not.toHaveBeenCalled();
  });

  it('passes the batch through unchanged when nothing already exists', async () => {
    const fresh = createAlertEvent({ status: 'breached', data: sourceRow('doc-1') });
    mockExisting([]);

    const state = createRulePipelineState({
      rule: createRuleResponse(),
      deduplication: ELIGIBLE,
      alertEventsBatch: [fresh],
    });
    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(result).toEqual({ type: 'continue', state });
  });

  it('chunks the ids query above 10,000 candidates', async () => {
    const events = Array.from({ length: 10_001 }, (_, i) =>
      createAlertEvent({ status: 'breached', data: sourceRow(`doc-${i}`) })
    );
    mockExisting([]);

    const state = createRulePipelineState({
      rule: createRuleResponse(),
      deduplication: ELIGIBLE,
      alertEventsBatch: events,
    });
    await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(esClient.search).toHaveBeenCalledTimes(2);
    const [first, second] = esClient.search.mock.calls.map(([req]) => req as { size?: number });
    expect(first.size).toBe(10_000);
    expect(second.size).toBe(1);
  });

  it('keeps the batch and warns when the pre-check fails, leaving dedup to the write', async () => {
    const event = createAlertEvent({ status: 'breached', data: sourceRow('doc-1') });
    esClient.search.mockRejectedValue(new Error('search unavailable'));

    const state = createRulePipelineState({
      rule: createRuleResponse(),
      deduplication: ELIGIBLE,
      alertEventsBatch: [event],
      logger: loggerService,
    });
    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(result.state.alertEventsBatch).toEqual([event]);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('ids pre-check failed'),
      expect.objectContaining({
        labels: expect.objectContaining({ code: 'RULE_EXECUTION_DEDUP_PRECHECK_FAILED' }),
      })
    );
  });
});
