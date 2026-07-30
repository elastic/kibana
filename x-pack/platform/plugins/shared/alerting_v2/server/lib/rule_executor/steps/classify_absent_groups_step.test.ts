/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  collectStreamResults,
  createPipelineStream,
  createRuleExecutionInput,
  createRulePipelineState,
  createAlertEvent,
  createRuleResponse,
  createEsqlResponse,
} from '../test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { createQueryService } from '../../services/query_service/query_service.mock';
import { buildGroupHash } from '../build_alert_events';
import type { AlertEvent } from '../../../resources/datastreams/alert_events';
import type { PipelineStateStream } from '../types';
import type { RuleResponse } from '../../rules_client';
import { ClassifyAbsentGroupsStep } from './classify_absent_groups_step';

const hashFor = (host: string): string =>
  buildGroupHash({
    rowDoc: { 'host.name': host },
    groupKeyFields: ['host.name'],
    fallbackSeed: 'x',
  });

describe('ClassifyAbsentGroupsStep', () => {
  const { loggerService } = createLoggerService();

  function createStep() {
    const internal = createQueryService();
    const scoped = createQueryService();
    const step = new ClassifyAbsentGroupsStep(
      loggerService,
      internal.queryService,
      scoped.queryService
    );
    return { step, internalEsClient: internal.mockEsClient, scopedEsClient: scoped.mockEsClient };
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

  const statusesByGroup = (
    events: ReadonlyArray<AlertEvent>
  ): Record<string, AlertEvent['status']> =>
    Object.fromEntries(events.map((e) => [e.group_hash, e.status]));

  describe('streaming / forwarding', () => {
    it('forwards every breach batch unchanged and in order, then appends the final batch', async () => {
      // Regression for the per-batch recovery bug: host-a breaches only in the
      // second batch; host-b/host-c breach in the first. Under the old per-batch
      // logic host-a would receive a spurious `recovered` in batch 1. It must not.
      const { step, internalEsClient } = createStep();
      mockActiveGroups(internalEsClient, ['host-a', 'host-b', 'host-c', 'host-d']);

      const rule = createRuleResponse({ kind: 'alert', recovery_strategy: 'no_breach' });

      const batch1 = createRulePipelineState({
        rule,
        alertEventsBatch: [
          createAlertEvent({ group_hash: 'host-b', status: 'breached' }),
          createAlertEvent({ group_hash: 'host-c', status: 'breached' }),
        ],
      });
      const batch2 = createRulePipelineState({
        rule,
        alertEventsBatch: [createAlertEvent({ group_hash: 'host-a', status: 'breached' })],
      });

      const results = await collectStreamResults(
        step.executeStream(createPipelineStream([batch1, batch2]))
      );

      // Two forwarded breach batches (unchanged, in order) + one final batch.
      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ type: 'continue', state: batch1 });
      expect(results[1]).toEqual({ type: 'continue', state: batch2 });

      const finalBatch = results[2].state.alertEventsBatch!;
      // host-a breached (in the full-run set) => never recovered.
      expect(finalBatch.some((e) => e.group_hash === 'host-a')).toBe(false);
      // Only the genuinely-absent host-d recovers, exactly once.
      expect(statusesByGroup(finalBatch)).toEqual({ 'host-d': 'recovered' });
    });

    it('propagates an upstream halt and emits no final batch', async () => {
      const { step, internalEsClient } = createStep();

      const rule = createRuleResponse({ kind: 'alert', recovery_strategy: 'no_breach' });
      const continueState = createRulePipelineState({ rule, alertEventsBatch: [] });
      const haltState = createRulePipelineState({ rule, alertEventsBatch: [] });

      async function* upstream(): PipelineStateStream {
        yield { type: 'continue', state: continueState };
        yield { type: 'halt', reason: 'state_not_ready', state: haltState };
      }

      const results = await collectStreamResults(step.executeStream(upstream()));

      expect(results).toEqual([
        { type: 'continue', state: continueState },
        { type: 'halt', reason: 'state_not_ready', state: haltState },
      ]);
      expect(internalEsClient.esql.query).not.toHaveBeenCalled();
    });

    it('emits no final batch when the stream is empty', async () => {
      const { step, internalEsClient } = createStep();

      const results = await collectStreamResults(step.executeStream(createPipelineStream([])));

      expect(results).toEqual([]);
      expect(internalEsClient.esql.query).not.toHaveBeenCalled();
    });
  });

  describe('classification gating', () => {
    it('emits no final batch for signal rules', async () => {
      const { step, internalEsClient, scopedEsClient } = createStep();

      const state = createRulePipelineState({
        rule: createRuleResponse({ kind: 'signal' }),
        alertEventsBatch: [createAlertEvent({ group_hash: 'host-a', status: 'breached' })],
      });

      const results = await collectStreamResults(step.executeStream(createPipelineStream([state])));

      expect(results).toEqual([{ type: 'continue', state }]);
      expect(internalEsClient.esql.query).not.toHaveBeenCalled();
      expect(scopedEsClient.esql.query).not.toHaveBeenCalled();
    });

    it("emits no final batch when recovery_strategy is 'none' and no_data_strategy is 'none'", async () => {
      const { step, internalEsClient } = createStep();

      const state = createRulePipelineState({
        rule: createRuleResponse({
          kind: 'alert',
          recovery_strategy: 'none',
          no_data_strategy: 'none',
        }),
        alertEventsBatch: [createAlertEvent({ group_hash: 'host-a', status: 'breached' })],
      });

      const results = await collectStreamResults(step.executeStream(createPipelineStream([state])));

      expect(results).toEqual([{ type: 'continue', state }]);
      expect(internalEsClient.esql.query).not.toHaveBeenCalled();
    });

    it('emits no final batch when there are no active groups', async () => {
      const { step, internalEsClient, scopedEsClient } = createStep();
      mockActiveGroups(internalEsClient, []);

      const state = createRulePipelineState({
        rule: createRuleResponse({ kind: 'alert', recovery_strategy: 'no_breach' }),
        alertEventsBatch: [createAlertEvent({ group_hash: 'host-a', status: 'breached' })],
      });

      const results = await collectStreamResults(step.executeStream(createPipelineStream([state])));

      expect(results).toHaveLength(1);
      expect(internalEsClient.esql.query).toHaveBeenCalledTimes(1);
      // Short-circuits before the data-presence query.
      expect(scopedEsClient.esql.query).not.toHaveBeenCalled();
    });
  });

  describe('recovery against the full-run breach set', () => {
    it('runs the recovery query and recovers matching active groups not in the breach set', async () => {
      const { step, internalEsClient, scopedEsClient } = createStep();
      const hashRec = hashFor('host-rec');
      const hashBreach = hashFor('host-breach');
      mockActiveGroups(internalEsClient, [hashRec, hashBreach]);

      // Recovery query matches both, but host-breach is in the breach set (batch 2).
      scopedEsClient.esql.query.mockResolvedValue(
        createEsqlResponse(
          [{ name: 'host.name', type: 'keyword' }],
          [['host-rec'], ['host-breach']]
        )
      );

      const rule = createRuleResponse({
        kind: 'alert',
        recovery_strategy: 'query',
        grouping: { fields: ['host.name'] },
        query: {
          format: 'standalone',
          breach: { query: 'FROM m | WHERE breach' },
          recovery: { query: 'FROM m | STATS c BY host.name' },
        },
      });

      const batch1 = createRulePipelineState({ rule, alertEventsBatch: [] });
      const batch2 = createRulePipelineState({
        rule,
        alertEventsBatch: [createAlertEvent({ group_hash: hashBreach, status: 'breached' })],
      });

      const results = await collectStreamResults(
        step.executeStream(createPipelineStream([batch1, batch2]))
      );

      const finalBatch = results[results.length - 1].state.alertEventsBatch!;
      expect(statusesByGroup(finalBatch)).toEqual({ [hashRec]: 'recovered' });
    });

    it('stamps rule.version on recovery events from the rule version', async () => {
      const { step, internalEsClient } = createStep();
      const hashRec = hashFor('host-rec');
      mockActiveGroups(internalEsClient, [hashRec]);

      const rule = createRuleResponse({
        kind: 'alert',
        recovery_strategy: 'no_breach',
        metadata: { version: 9 },
        grouping: { fields: ['host.name'] },
        query: {
          format: 'standalone',
          breach: { query: 'FROM m | WHERE breach' },
        },
      });

      const results = await collectStreamResults(
        step.executeStream(
          createPipelineStream([createRulePipelineState({ rule, alertEventsBatch: [] })])
        )
      );

      const finalBatch = results[results.length - 1].state.alertEventsBatch!;
      expect(finalBatch).toHaveLength(1);
      expect(finalBatch[0].rule.version).toBe(9);
    });
  });

  describe('no-data / continued-breach classification', () => {
    it('partitions unresolved absent groups using the full breach + recovered sets (query strategy)', async () => {
      const { step, internalEsClient, scopedEsClient } = createStep();
      const hashBreach = hashFor('host-breach');
      const hashNoData = hashFor('host-nodata');
      const hashPresent = hashFor('host-present');
      mockActiveGroups(internalEsClient, [hashBreach, hashNoData, hashPresent]);

      scopedEsClient.esql.query.mockImplementation(async (params: { query: string }) => {
        // Recovery query matches nothing; data-presence reports host-present.
        if (String(params.query).includes('recovery_match')) {
          return createEsqlResponse([], []);
        }
        return createEsqlResponse([{ name: 'host.name', type: 'keyword' }], [['host-present']]);
      });

      const rule = createRuleResponse({
        kind: 'alert',
        recovery_strategy: 'query',
        no_data_strategy: 'emit',
        grouping: { fields: ['host.name'] },
        query: {
          format: 'standalone',
          breach: { query: 'FROM m | WHERE breach' },
          recovery: { query: 'FROM m | WHERE recovery_match' },
          no_data: { query: 'FROM m | STATS c BY host.name' },
        },
      });

      const state = createRulePipelineState({
        rule,
        alertEventsBatch: [createAlertEvent({ group_hash: hashBreach, status: 'breached' })],
      });

      const results = await collectStreamResults(step.executeStream(createPipelineStream([state])));

      const finalBatch = results[results.length - 1].state.alertEventsBatch!;
      expect(statusesByGroup(finalBatch)).toEqual({
        [hashNoData]: 'no_data',
        [hashPresent]: 'breached',
      });
      // Continued-breach events carry an empty data payload.
      const present = finalBatch.find((e) => e.group_hash === hashPresent)!;
      expect(present.data).toEqual({});
    });

    it('does not classify a group as no_data/continued-breach when it breaches in a later batch', async () => {
      // Multi-batch regression for the no-data path — the sibling of the
      // recovery regression in "streaming / forwarding". host-a breaches only
      // in the SECOND batch. Under the old per-batch `CreateNoDataEventsStep`,
      // batch 1 would see host-a active, absent, and with no data and emit a
      // spurious `no_data` event for a group that is actually breaching this
      // run. Against the full-run breach set it must be excluded entirely.
      const { step, internalEsClient, scopedEsClient } = createStep();
      const hashA = hashFor('host-a');
      const hashNoData = hashFor('host-nodata');
      const hashGap = hashFor('host-gap');
      mockActiveGroups(internalEsClient, [hashA, hashNoData, hashGap]);

      scopedEsClient.esql.query.mockImplementation(async (params: { query: string }) => {
        // Recovery query matches nothing; data-presence reports only host-gap.
        if (String(params.query).includes('recovery_match')) {
          return createEsqlResponse([], []);
        }
        return createEsqlResponse([{ name: 'host.name', type: 'keyword' }], [['host-gap']]);
      });

      const rule = createRuleResponse({
        kind: 'alert',
        recovery_strategy: 'query',
        no_data_strategy: 'emit',
        grouping: { fields: ['host.name'] },
        query: {
          format: 'standalone',
          breach: { query: 'FROM m | WHERE breach' },
          recovery: { query: 'FROM m | WHERE recovery_match' },
          no_data: { query: 'FROM m | STATS c BY host.name' },
        },
      });

      // A filler group breaches in batch 1; host-a breaches only in batch 2.
      const batch1 = createRulePipelineState({
        rule,
        alertEventsBatch: [
          createAlertEvent({ group_hash: hashFor('host-early'), status: 'breached' }),
        ],
      });
      const batch2 = createRulePipelineState({
        rule,
        alertEventsBatch: [createAlertEvent({ group_hash: hashA, status: 'breached' })],
      });

      const results = await collectStreamResults(
        step.executeStream(createPipelineStream([batch1, batch2]))
      );

      const finalBatch = results[results.length - 1].state.alertEventsBatch!;
      // host-a breached in batch 2 (full-run set) => never no_data / continued-breach.
      expect(finalBatch.some((e) => e.group_hash === hashA)).toBe(false);
      // Only the genuinely-absent groups are classified: no_data (no data) and
      // continued-breach (data present, query gap).
      expect(statusesByGroup(finalBatch)).toEqual({
        [hashNoData]: 'no_data',
        [hashGap]: 'breached',
      });
      const gap = finalBatch.find((e) => e.group_hash === hashGap)!;
      expect(gap.data).toEqual({});
    });

    it('runs the data-presence query exactly once regardless of batch count', async () => {
      const { step, internalEsClient, scopedEsClient } = createStep();
      mockActiveGroups(internalEsClient, [hashFor('host-a')]);
      scopedEsClient.esql.query.mockResolvedValue(createEsqlResponse([], []));

      const rule = createRuleResponse({
        kind: 'alert',
        recovery_strategy: 'no_breach',
        no_data_strategy: 'emit',
        grouping: { fields: ['host.name'] },
        query: {
          format: 'standalone',
          breach: { query: 'FROM m | WHERE breach' },
          no_data: { query: 'FROM m | STATS c BY host.name' },
        },
      });

      await collectStreamResults(
        step.executeStream(
          createPipelineStream([
            createRulePipelineState({ rule, alertEventsBatch: [] }),
            createRulePipelineState({ rule, alertEventsBatch: [] }),
          ])
        )
      );

      // Active-groups lookup once, data-presence query once (not per batch).
      expect(internalEsClient.esql.query).toHaveBeenCalledTimes(1);
      expect(scopedEsClient.esql.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('cancellation', () => {
    it('forwards the executionContext abort signal to the finalization queries', async () => {
      const { step, internalEsClient, scopedEsClient } = createStep();
      mockActiveGroups(internalEsClient, [hashFor('host-a')]);
      scopedEsClient.esql.query.mockResolvedValue(createEsqlResponse([], []));

      const abortController = new AbortController();
      const input = createRuleExecutionInput({ abortSignal: abortController.signal });
      const rule: RuleResponse = createRuleResponse({
        kind: 'alert',
        recovery_strategy: 'no_breach',
        no_data_strategy: 'emit',
        grouping: { fields: ['host.name'] },
        query: {
          format: 'standalone',
          breach: { query: 'FROM m | WHERE breach' },
          no_data: { query: 'FROM m | STATS c BY host.name' },
        },
      });

      await collectStreamResults(
        step.executeStream(
          createPipelineStream([createRulePipelineState({ input, rule, alertEventsBatch: [] })])
        )
      );

      expect(internalEsClient.esql.query).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ signal: abortController.signal })
      );
      expect(scopedEsClient.esql.query).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ signal: abortController.signal })
      );
    });
  });
});
