/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  collectStreamResults,
  createPipelineStream,
  createRulePipelineState,
  createAlertEvent,
  createRuleResponse,
  createEsqlResponse,
} from '../test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { createQueryService } from '../../services/query_service/query_service.mock';
import type { AlertEvent } from '../../../resources/datastreams/alert_events';
import type { RuleResponse } from '../../rules_client';
import { CreateNoDataEventsStep } from './create_no_data_events_step';

describe('CreateNoDataEventsStep', () => {
  const { loggerService } = createLoggerService();

  function createStep() {
    const internal = createQueryService();
    const step = new CreateNoDataEventsStep(loggerService, internal.queryService);
    return { step, internalEsClient: internal.mockEsClient };
  }

  function mockActiveGroups(
    internalEsClient: ReturnType<typeof createStep>['internalEsClient'],
    groupHashes: string[]
  ) {
    internalEsClient.esql.query.mockResolvedValue(
      createEsqlResponse(
        [{ name: 'group_hash', type: 'keyword' }],
        groupHashes.map((h) => [h])
      )
    );
  }

  function buildRule(overrides: Partial<RuleResponse> = {}): RuleResponse {
    return createRuleResponse({
      kind: 'alert',
      grouping: { fields: ['host.name'] },
      recovery_strategy: 'no_breach',
      no_data_strategy: 'emit',
      query: {
        format: 'standalone',
        breach: { query: 'FROM metrics-* | WHERE avg_cpu > 90' },
        no_data: { query: 'FROM metrics-* | STATS COUNT(*) BY host.name' },
      },
      ...overrides,
    });
  }

  async function runStep({
    step,
    rule,
    incomingEvents,
    dataPresentGroupHashes,
  }: {
    step: CreateNoDataEventsStep;
    rule: RuleResponse;
    incomingEvents: AlertEvent[];
    dataPresentGroupHashes?: ReadonlySet<string>;
  }) {
    const state = createRulePipelineState({
      rule,
      alertEventsBatch: incomingEvents,
      dataPresentGroupHashes,
    });
    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));
    return { result, initialState: state };
  }

  function statusesByGroup(
    events: ReadonlyArray<AlertEvent>
  ): Record<string, AlertEvent['status']> {
    return Object.fromEntries(events.map((e) => [e.group_hash, e.status]));
  }

  it('skips for non-alert rules (signal rules have no episode lifecycle)', async () => {
    const { step, internalEsClient } = createStep();

    const { result, initialState } = await runStep({
      step,
      rule: createRuleResponse({ kind: 'signal', no_data_strategy: 'emit' }),
      incomingEvents: [createAlertEvent()],
      dataPresentGroupHashes: new Set(),
    });

    expect(internalEsClient.esql.query).not.toHaveBeenCalled();
    expect(result.state.alertEventsBatch).toEqual(initialState.alertEventsBatch);
  });

  it('skips when no no_data_strategy: none', async () => {
    const { step, internalEsClient } = createStep();

    const incoming = createAlertEvent({ group_hash: 'hash-1', status: 'breached' });
    const { result } = await runStep({
      step,
      rule: buildRule({ no_data_strategy: 'none' }),
      incomingEvents: [incoming],
      dataPresentGroupHashes: undefined,
    });

    // No active-groups lookup and no events written.
    expect(internalEsClient.esql.query).not.toHaveBeenCalled();
    expect(result.state.alertEventsBatch).toEqual([incoming]);
  });

  it('does not query active groups when there are none for the rule', async () => {
    const { step, internalEsClient } = createStep();

    mockActiveGroups(internalEsClient, []);

    const { result } = await runStep({
      step,
      rule: buildRule(),
      incomingEvents: [],
      dataPresentGroupHashes: new Set(),
    });

    expect(internalEsClient.esql.query).toHaveBeenCalledTimes(1);
    expect(result.state.alertEventsBatch).toEqual([]);
  });

  it('skips when every active group is still breaching', async () => {
    const { step, internalEsClient } = createStep();

    mockActiveGroups(internalEsClient, ['hash-1']);

    const breached = createAlertEvent({ group_hash: 'hash-1', status: 'breached' });
    const { result } = await runStep({
      step,
      rule: buildRule(),
      incomingEvents: [breached],
      dataPresentGroupHashes: new Set(),
    });

    expect(result.state.alertEventsBatch).toEqual([breached]);
  });

  it('leaves groups with an upstream recovered event untouched (recovery takes priority)', async () => {
    const { step, internalEsClient } = createStep();

    mockActiveGroups(internalEsClient, ['hash-1']);

    const recovered = createAlertEvent({ group_hash: 'hash-1', status: 'recovered' });
    const { result } = await runStep({
      step,
      rule: buildRule(),
      incomingEvents: [recovered],
      // Even though hash-1 has no data, its recovered event wins.
      dataPresentGroupHashes: new Set(),
    });

    expect(result.state.alertEventsBatch).toEqual([recovered]);
  });

  describe('absent group with no data', () => {
    it.each([['no_breach'], ['query']] as const)(
      'recovery_strategy: %s — emits a no_data event for an absent group with no data',
      async (recovery_strategy) => {
        const { step, internalEsClient } = createStep();

        mockActiveGroups(internalEsClient, ['hash-1']);

        const { result } = await runStep({
          step,
          rule: buildRule({ recovery_strategy }),
          incomingEvents: [],
          dataPresentGroupHashes: new Set(),
        });

        expect(statusesByGroup(result.state.alertEventsBatch!)).toEqual({
          'hash-1': 'no_data',
        });
      }
    );
  });

  describe('data present but no breach/recovery match', () => {
    it("recovery_strategy: 'query' — emits a continued breached event when data is present but neither breach nor recovery matched", async () => {
      const { step, internalEsClient } = createStep();

      mockActiveGroups(internalEsClient, ['hash-1']);

      const { result } = await runStep({
        step,
        rule: buildRule({ recovery_strategy: 'query' }),
        incomingEvents: [],
        dataPresentGroupHashes: new Set(['hash-1']),
      });

      const events = result.state.alertEventsBatch!;
      expect(statusesByGroup(events)).toEqual({ 'hash-1': 'breached' });
      // Continued-breach events carry an empty data payload.
      expect(events[0].data).toEqual({});
    });

    it("recovery_strategy: 'no_breach' — writes no event (these groups recover upstream)", async () => {
      const { step, internalEsClient } = createStep();

      mockActiveGroups(internalEsClient, ['hash-1']);

      const { result } = await runStep({
        step,
        rule: buildRule({ recovery_strategy: 'no_breach' }),
        incomingEvents: [],
        dataPresentGroupHashes: new Set(['hash-1']),
      });

      expect(result.state.alertEventsBatch).toEqual([]);
    });
  });

  it('partitions a mix of absent groups into no_data and continued-breach (query strategy)', async () => {
    const { step, internalEsClient } = createStep();

    mockActiveGroups(internalEsClient, [
      'hash-breach',
      'hash-nodata',
      'hash-present',
      'hash-recovered',
    ]);

    const { result } = await runStep({
      step,
      rule: buildRule({ recovery_strategy: 'query' }),
      incomingEvents: [
        createAlertEvent({ group_hash: 'hash-breach', status: 'breached' }),
        createAlertEvent({ group_hash: 'hash-recovered', status: 'recovered' }),
      ],
      dataPresentGroupHashes: new Set(['hash-present']),
    });

    expect(statusesByGroup(result.state.alertEventsBatch!)).toEqual({
      'hash-breach': 'breached',
      'hash-recovered': 'recovered',
      'hash-nodata': 'no_data',
      'hash-present': 'breached',
    });
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
