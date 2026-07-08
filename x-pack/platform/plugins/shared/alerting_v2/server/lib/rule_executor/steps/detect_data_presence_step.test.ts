/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiagnosticResult } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';
import { TaskErrorSource } from '@kbn/task-manager-plugin/server';
import { getErrorSource } from '@kbn/task-manager-plugin/server/task_running';
import {
  collectStreamResults,
  createPipelineStream,
  createRuleExecutionInput,
  createRulePipelineState,
  createAlertEvent,
  createRuleResponse,
  createEsqlResponse,
  getStepError,
} from '../test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { createQueryService } from '../../services/query_service/query_service.mock';
import { buildGroupHash } from '../build_alert_events';
import type { RuleResponse } from '../../rules_client';
import { DetectDataPresenceStep } from './detect_data_presence_step';

const HOST = 'abc';
const groupingFields = ['host.name'];
const hostHash = buildGroupHash({
  rowDoc: { 'host.name': HOST },
  groupKeyFields: groupingFields,
  fallbackSeed: 'unused',
});

describe('DetectDataPresenceStep', () => {
  const { loggerService } = createLoggerService();

  function createStep() {
    const scoped = createQueryService();
    const step = new DetectDataPresenceStep(loggerService, scoped.queryService);
    return { step, scopedEsClient: scoped.mockEsClient };
  }

  function buildRule(overrides: Partial<RuleResponse> = {}): RuleResponse {
    return createRuleResponse({
      kind: 'alert',
      grouping: { fields: groupingFields },
      no_data_strategy: 'emit',
      query: {
        format: 'standalone',
        breach: { query: 'FROM metrics-* | WHERE avg_cpu > 90' },
        no_data: { query: 'FROM metrics-* | STATS COUNT(*) BY host.name' },
      },
      ...overrides,
    });
  }

  it('skips for non-alert rules', async () => {
    const { step, scopedEsClient } = createStep();

    const state = createRulePipelineState({
      rule: createRuleResponse({ kind: 'signal', no_data_strategy: 'emit' }),
      alertEventsBatch: [],
    });
    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(scopedEsClient.esql.query).not.toHaveBeenCalled();
    expect(result.type).toBe('continue');
    expect(result.state.dataPresentGroupHashes).toBeUndefined();
  });

  it("skips when no_data_strategy is 'none'", async () => {
    const { step, scopedEsClient } = createStep();

    const state = createRulePipelineState({
      rule: buildRule({ no_data_strategy: 'none' }),
      alertEventsBatch: [],
    });
    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(scopedEsClient.esql.query).not.toHaveBeenCalled();
    expect(result.state.dataPresentGroupHashes).toBeUndefined();
  });

  it('skips when a standalone rule omits the query.no_data block', async () => {
    const { step, scopedEsClient } = createStep();

    const state = createRulePipelineState({
      rule: createRuleResponse({
        kind: 'alert',
        no_data_strategy: 'emit',
        grouping: { fields: groupingFields },
        query: { format: 'standalone', breach: { query: 'FROM metrics-*' } },
      }),
      alertEventsBatch: [],
    });
    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(scopedEsClient.esql.query).not.toHaveBeenCalled();
    expect(result.state.dataPresentGroupHashes).toBeUndefined();
  });

  it('records the group hashes reported by the no-data query', async () => {
    const { step, scopedEsClient } = createStep();

    scopedEsClient.esql.query.mockResolvedValue(
      createEsqlResponse([{ name: 'host.name', type: 'keyword' }], [[HOST]])
    );

    const state = createRulePipelineState({ rule: buildRule(), alertEventsBatch: [] });
    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(scopedEsClient.esql.query).toHaveBeenCalledTimes(1);
    expect(result.state.dataPresentGroupHashes).toEqual(new Set([hostHash]));
  });

  it('records an empty set when the no-data query returns no rows', async () => {
    const { step, scopedEsClient } = createStep();

    scopedEsClient.esql.query.mockResolvedValue(createEsqlResponse([], []));

    const state = createRulePipelineState({ rule: buildRule(), alertEventsBatch: [] });
    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(result.state.dataPresentGroupHashes).toEqual(new Set());
  });

  it('uses the composed base query as the no-data query', async () => {
    const { step, scopedEsClient } = createStep();

    const baseQuery = 'FROM metrics-* | STATS AVG(cpu) BY host.name';
    scopedEsClient.esql.query.mockResolvedValue(
      createEsqlResponse([{ name: 'host.name', type: 'keyword' }], [[HOST]])
    );

    const composedRule = createRuleResponse({
      kind: 'alert',
      no_data_strategy: 'emit',
      grouping: { fields: groupingFields },
      query: {
        format: 'composed',
        base: baseQuery,
        breach: { segment: 'WHERE AVG(cpu) > 0.9' },
      },
    });

    const state = createRulePipelineState({ rule: composedRule, alertEventsBatch: [] });
    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(scopedEsClient.esql.query).toHaveBeenCalledWith(
      expect.objectContaining({ query: baseQuery }),
      expect.any(Object)
    );
    expect(result.state.dataPresentGroupHashes).toEqual(new Set([hostHash]));
  });

  it('surfaces ES|QL 4xx errors from the data-presence query as TaskErrorSource.USER', async () => {
    const { step, scopedEsClient } = createStep();

    scopedEsClient.esql.query.mockRejectedValue(
      // @ts-expect-error: Not all params are needed for the test.
      new errors.ResponseError({ statusCode: 400 })
    );

    const state = createRulePipelineState({ rule: buildRule(), alertEventsBatch: [] });
    const error = await getStepError(step, state);

    expect(error).toBeInstanceOf(Error);
    expect(getErrorSource(error!)).toBe(TaskErrorSource.USER);
  });

  it('does not classify ES|QL 5xx errors as user errors (server-side, retryable)', async () => {
    const { step, scopedEsClient } = createStep();

    scopedEsClient.esql.query.mockRejectedValue(
      new errors.ResponseError({ statusCode: 503 } as DiagnosticResult)
    );

    const state = createRulePipelineState({ rule: buildRule(), alertEventsBatch: [] });
    const error = await getStepError(step, state);

    expect(error).toBeInstanceOf(Error);
    expect(getErrorSource(error!)).toBeUndefined();
  });

  it('forwards the executionContext abort signal to the data-presence ES|QL call', async () => {
    const { step, scopedEsClient } = createStep();

    scopedEsClient.esql.query.mockResolvedValue(createEsqlResponse([], []));

    const abortController = new AbortController();
    const input = createRuleExecutionInput({ abortSignal: abortController.signal });

    const state = createRulePipelineState({
      input,
      rule: buildRule(),
      alertEventsBatch: [],
    });

    await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(scopedEsClient.esql.query).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ signal: abortController.signal })
    );
  });

  it('halts with state_not_ready when `rule` is missing from pipeline state', async () => {
    const { step } = createStep();

    const state = createRulePipelineState({ alertEventsBatch: [createAlertEvent()] });
    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(result).toEqual({ type: 'halt', reason: 'state_not_ready', state });
  });

  it('halts with state_not_ready when `alertEventsBatch` is missing from pipeline state', async () => {
    const { step } = createStep();

    const state = createRulePipelineState({ rule: createRuleResponse() });
    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(result).toEqual({ type: 'halt', reason: 'state_not_ready', state });
  });
});
