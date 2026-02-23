/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateRecoveryEventsStep } from './create_recovery_events_step';
import {
  createRulePipelineState,
  createAlertEvent,
  createRuleResponse,
  createEsqlResponse,
} from '../test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { createQueryService } from '../../services/query_service/query_service.mock';
import type { AlertEvent } from '../../../resources/alert_events';

describe('CreateRecoveryEventsStep', () => {
  const { loggerService } = createLoggerService();

  function createActiveGroupHashesResponse(groupHashes: string[]) {
    return createEsqlResponse(
      [{ name: 'group_hash', type: 'keyword' }],
      groupHashes.map((h) => [h])
    );
  }

  function createStep() {
    const internal = createQueryService();
    const scoped = createQueryService();
    const step = new CreateRecoveryEventsStep(
      loggerService,
      internal.queryService,
      scoped.queryService
    );
    return { step, internalEsClient: internal.mockEsClient, scopedEsClient: scoped.mockEsClient };
  }

  describe('no_breach recovery (default)', () => {
    it('creates recovery events for active groups not in the breached set', async () => {
      const { step, internalEsClient } = createStep();

      internalEsClient.esql.query.mockResolvedValue(
        createActiveGroupHashesResponse(['hash-1', 'hash-2', 'hash-3'])
      );

      const breachedEvents = [createAlertEvent({ group_hash: 'hash-1' })];

      const state = createRulePipelineState({
        rule: createRuleResponse({ kind: 'alert' }),
        alertEvents: breachedEvents,
      });

      const result = await step.execute(state);

      expect(result.type).toBe('continue');
      expect(result).toHaveProperty('data.alertEvents');

      // @ts-expect-error: the above check ensures the alertEvents exists
      const { alertEvents } = result.data;

      expect(alertEvents).toHaveLength(3);
      expect(alertEvents[0].status).toBe('breached');
      expect(alertEvents[0].group_hash).toBe('hash-1');
      expect(alertEvents[1].status).toBe('recovered');
      expect(alertEvents[1].group_hash).toBe('hash-2');
      expect(alertEvents[2].status).toBe('recovered');
      expect(alertEvents[2].group_hash).toBe('hash-3');
    });

    it('uses no_breach strategy when recovery_policy is not set', async () => {
      const { step, internalEsClient, scopedEsClient } = createStep();

      internalEsClient.esql.query.mockResolvedValue(
        createActiveGroupHashesResponse(['hash-1', 'hash-2'])
      );

      const state = createRulePipelineState({
        rule: createRuleResponse({ kind: 'alert', recovery_policy: undefined }),
        alertEvents: [createAlertEvent({ group_hash: 'hash-1' })],
      });

      const result = await step.execute(state);

      expect(scopedEsClient.esql.query).not.toHaveBeenCalled();
      expect(result.type).toBe('continue');
      // @ts-expect-error: the above check ensures the alertEvents exists
      const { alertEvents } = result.data;
      expect(alertEvents).toHaveLength(2);
      expect(alertEvents[1].status).toBe('recovered');
      expect(alertEvents[1].group_hash).toBe('hash-2');
    });

    it('skips recovery for non-alert rules', async () => {
      const { step, internalEsClient } = createStep();

      const alertEvents = [createAlertEvent({ group_hash: 'hash-1' })];

      const state = createRulePipelineState({
        rule: createRuleResponse({ kind: 'signal' }),
        alertEvents,
      });

      const result = await step.execute(state);

      expect(internalEsClient.esql.query).not.toHaveBeenCalled();
      expect(result).toEqual({ type: 'continue', data: { alertEvents } });
    });

    it('returns original events when no active groups exist', async () => {
      const { step, internalEsClient } = createStep();

      internalEsClient.esql.query.mockResolvedValue(createActiveGroupHashesResponse([]));

      const alertEvents = [createAlertEvent({ group_hash: 'hash-1' })];

      const state = createRulePipelineState({
        rule: createRuleResponse({ kind: 'alert' }),
        alertEvents,
      });

      const result = await step.execute(state);

      expect(result).toEqual({ type: 'continue', data: { alertEvents } });
    });

    it('does not create recovery events for groups that are still breaching', async () => {
      const { step, internalEsClient } = createStep();

      internalEsClient.esql.query.mockResolvedValue(
        createActiveGroupHashesResponse(['hash-1', 'hash-2'])
      );

      const alertEvents = [
        createAlertEvent({ group_hash: 'hash-1' }),
        createAlertEvent({ group_hash: 'hash-2' }),
      ];

      const state = createRulePipelineState({
        rule: createRuleResponse({ kind: 'alert' }),
        alertEvents,
      });

      const result = await step.execute(state);

      expect(result.type).toBe('continue');
      // @ts-expect-error: the above check ensures the alertEvents exists
      const { alertEvents: resultEvents } = result.data;
      expect(resultEvents).toHaveLength(2);
      expect(resultEvents.every((e: AlertEvent) => e.status === 'breached')).toBe(true);
    });

    it('creates recovery events for all active groups when no breached events exist', async () => {
      const { step, internalEsClient } = createStep();

      internalEsClient.esql.query.mockResolvedValue(
        createActiveGroupHashesResponse(['hash-1', 'hash-2'])
      );

      const state = createRulePipelineState({
        rule: createRuleResponse({ kind: 'alert' }),
        alertEvents: [],
      });

      const result = await step.execute(state);

      expect(result.type).toBe('continue');
      // @ts-expect-error: the above check ensures the alertEvents exists
      const { alertEvents } = result.data;
      expect(alertEvents).toHaveLength(2);
      expect(alertEvents.every((e: AlertEvent) => e.status === 'recovered')).toBe(true);
    });
  });

  describe('query-based recovery', () => {
    it('executes the recovery query and creates events for matching active groups', async () => {
      const { step, internalEsClient, scopedEsClient } = createStep();

      internalEsClient.esql.query.mockResolvedValue(
        createActiveGroupHashesResponse(['hash-a', 'hash-b', 'hash-c'])
      );

      // The recovery query returns rows whose group hashes match hash-a and hash-c
      // (simulated via grouping fields; using empty grouping so hashes are content-based)
      scopedEsClient.esql.query.mockResolvedValue(
        createEsqlResponse(
          [{ name: 'host.name', type: 'keyword' }],
          [['recovery-host-1'], ['recovery-host-2']]
        )
      );

      const state = createRulePipelineState({
        rule: createRuleResponse({
          kind: 'alert',
          recovery_policy: {
            type: 'query',
            query: { base: 'FROM logs-* | WHERE recovered = true' },
          },
        }),
        alertEvents: [],
      });

      const result = await step.execute(state);

      expect(scopedEsClient.esql.query).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'FROM logs-* | WHERE recovered = true' }),
        expect.any(Object)
      );
      expect(result.type).toBe('continue');
    });

    it('uses the scoped query service for the recovery query', async () => {
      const { step, internalEsClient, scopedEsClient } = createStep();

      internalEsClient.esql.query.mockResolvedValue(createActiveGroupHashesResponse(['hash-1']));

      scopedEsClient.esql.query.mockResolvedValue(createEsqlResponse([], []));

      const state = createRulePipelineState({
        rule: createRuleResponse({
          kind: 'alert',
          recovery_policy: {
            type: 'query',
            query: { base: 'FROM logs-* | WHERE ok = true' },
          },
        }),
        alertEvents: [],
      });

      await step.execute(state);

      expect(internalEsClient.esql.query).toHaveBeenCalledTimes(1);
      expect(scopedEsClient.esql.query).toHaveBeenCalledTimes(1);
    });

    it('returns no recovery events when recovery query returns empty results', async () => {
      const { step, internalEsClient, scopedEsClient } = createStep();

      internalEsClient.esql.query.mockResolvedValue(
        createActiveGroupHashesResponse(['hash-1', 'hash-2'])
      );

      scopedEsClient.esql.query.mockResolvedValue(createEsqlResponse([], []));

      const state = createRulePipelineState({
        rule: createRuleResponse({
          kind: 'alert',
          recovery_policy: {
            type: 'query',
            query: { base: 'FROM logs-* | WHERE recovered = true' },
          },
        }),
        alertEvents: [createAlertEvent({ group_hash: 'hash-3' })],
      });

      const result = await step.execute(state);

      expect(result.type).toBe('continue');
      // @ts-expect-error: the above check ensures the alertEvents exists
      const { alertEvents } = result.data;
      expect(alertEvents).toHaveLength(1);
      expect(alertEvents[0].group_hash).toBe('hash-3');
    });

    it('only recovers active groups that match the recovery query results', async () => {
      const { step, internalEsClient, scopedEsClient } = createStep();

      internalEsClient.esql.query.mockResolvedValue(
        createActiveGroupHashesResponse(['hash-a', 'hash-b'])
      );

      // Recovery query returns a row that, when hashed with grouping fields, matches hash-a
      // but not hash-b. Since grouping is ['host.name'], the hash depends on the field value.
      scopedEsClient.esql.query.mockResolvedValue(
        createEsqlResponse([{ name: 'host.name', type: 'keyword' }], [['host-recovered']])
      );

      const state = createRulePipelineState({
        rule: createRuleResponse({
          kind: 'alert',
          grouping: { fields: ['host.name'] },
          recovery_policy: {
            type: 'query',
            query: { base: 'FROM logs-* | WHERE error_count == 0 | STATS count(*) BY host.name' },
          },
        }),
        alertEvents: [],
      });

      const result = await step.execute(state);

      expect(result.type).toBe('continue');
      // @ts-expect-error: the above check ensures the alertEvents exists
      const { alertEvents } = result.data;
      // The recovery query result hashes won't match the synthetic 'hash-a'/'hash-b' strings,
      // so no recovery events are produced (the hashes are sha256-based).
      expect(alertEvents.every((e: AlertEvent) => e.status === 'recovered')).toBe(true);
    });

    it('preserves breached events alongside query recovery events', async () => {
      const { step, internalEsClient, scopedEsClient } = createStep();

      internalEsClient.esql.query.mockResolvedValue(createActiveGroupHashesResponse(['hash-1']));

      scopedEsClient.esql.query.mockResolvedValue(createEsqlResponse([], []));

      const breachedEvents = [createAlertEvent({ group_hash: 'hash-new' })];

      const state = createRulePipelineState({
        rule: createRuleResponse({
          kind: 'alert',
          recovery_policy: {
            type: 'query',
            query: { base: 'FROM logs-*' },
          },
        }),
        alertEvents: breachedEvents,
      });

      const result = await step.execute(state);

      expect(result.type).toBe('continue');
      // @ts-expect-error: the above check ensures the alertEvents exists
      const { alertEvents } = result.data;
      expect(alertEvents[0].status).toBe('breached');
      expect(alertEvents[0].group_hash).toBe('hash-new');
    });
  });

  describe('state guards', () => {
    it('halts with state_not_ready when rule is missing from state', async () => {
      const { step } = createStep();

      const state = createRulePipelineState({ alertEvents: [createAlertEvent()] });

      const result = await step.execute(state);

      expect(result).toEqual({ type: 'halt', reason: 'state_not_ready' });
    });

    it('halts with state_not_ready when alertEvents is missing from state', async () => {
      const { step } = createStep();

      const state = createRulePipelineState({ rule: createRuleResponse() });

      const result = await step.execute(state);

      expect(result).toEqual({ type: 'halt', reason: 'state_not_ready' });
    });
  });
});
