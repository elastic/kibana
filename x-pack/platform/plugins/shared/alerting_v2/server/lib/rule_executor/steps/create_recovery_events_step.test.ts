/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiagnosticResult } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';
import { CreateRecoveryEventsStep } from './create_recovery_events_step';
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
import type { AlertEvent } from '../../../resources/datastreams/alert_events';

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

  describe('recovery disabled', () => {
    it('skips recovery entirely when recovery_strategy is omitted', async () => {
      const { step, internalEsClient, scopedEsClient } = createStep();

      const breachedEvents = [createAlertEvent({ group_hash: 'hash-1' })];

      const state = createRulePipelineState({
        rule: createRuleResponse({
          kind: 'alert',
          recovery_strategy: undefined,
          query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 10' } },
        }),
        alertEventsBatch: breachedEvents,
      });

      const [result] = await collectStreamResults(
        step.executeStream(createPipelineStream([state]))
      );

      expect(internalEsClient.esql.query).not.toHaveBeenCalled();
      expect(scopedEsClient.esql.query).not.toHaveBeenCalled();
      expect(result).toEqual({ type: 'continue', state });
    });

    it('skips recovery for non-alert rules', async () => {
      const { step, internalEsClient } = createStep();

      const alertEventsBatch = [createAlertEvent({ group_hash: 'hash-1' })];

      const state = createRulePipelineState({
        rule: createRuleResponse({ kind: 'signal' }),
        alertEventsBatch,
      });

      const [result] = await collectStreamResults(
        step.executeStream(createPipelineStream([state]))
      );

      expect(internalEsClient.esql.query).not.toHaveBeenCalled();
      expect(result).toEqual({ type: 'continue', state });
    });
  });

  describe('no_breach strategy', () => {
    it('creates recovery events for active groups not in the breached set', async () => {
      const { step, internalEsClient } = createStep();

      internalEsClient.esql.query.mockResolvedValue(
        createActiveGroupHashesResponse(['hash-1', 'hash-2', 'hash-3'])
      );

      const breachedEvents = [createAlertEvent({ group_hash: 'hash-1' })];

      const state = createRulePipelineState({
        rule: createRuleResponse({
          kind: 'alert',
          recovery_strategy: 'no_breach',
          query: {
            format: 'standalone',
            breach: { query: 'FROM logs-* | LIMIT 10' },
          },
        }),
        alertEventsBatch: breachedEvents,
      });

      const [result] = await collectStreamResults(
        step.executeStream(createPipelineStream([state]))
      );

      expect(result.type).toBe('continue');
      const alertEvents = result.state.alertEventsBatch!;
      expect(alertEvents).toHaveLength(3);
      expect(alertEvents[0].status).toBe('breached');
      expect(alertEvents[0].group_hash).toBe('hash-1');
      expect(alertEvents[1].status).toBe('recovered');
      expect(alertEvents[1].group_hash).toBe('hash-2');
      expect(alertEvents[2].status).toBe('recovered');
      expect(alertEvents[2].group_hash).toBe('hash-3');
    });

    it('does not execute a custom recovery query when strategy is no_breach', async () => {
      const { step, internalEsClient, scopedEsClient } = createStep();

      internalEsClient.esql.query.mockResolvedValue(
        createActiveGroupHashesResponse(['hash-1', 'hash-2'])
      );

      const state = createRulePipelineState({
        rule: createRuleResponse({
          kind: 'alert',
          recovery_strategy: 'no_breach',
          query: {
            format: 'standalone',
            breach: { query: 'FROM logs-* | LIMIT 10' },
          },
        }),
        alertEventsBatch: [createAlertEvent({ group_hash: 'hash-1' })],
      });

      const [result] = await collectStreamResults(
        step.executeStream(createPipelineStream([state]))
      );

      expect(scopedEsClient.esql.query).not.toHaveBeenCalled();
      expect(result.type).toBe('continue');
      const alertEvents = result.state.alertEventsBatch!;
      expect(alertEvents).toHaveLength(2);
      expect(alertEvents[0].status).toBe('breached');
      expect(alertEvents[0].group_hash).toBe('hash-1');
      expect(alertEvents[1].status).toBe('recovered');
      expect(alertEvents[1].group_hash).toBe('hash-2');
    });

    it('returns original events when no active groups exist', async () => {
      const { step, internalEsClient } = createStep();

      internalEsClient.esql.query.mockResolvedValue(createActiveGroupHashesResponse([]));

      const alertEventsBatch = [createAlertEvent({ group_hash: 'hash-1' })];

      const state = createRulePipelineState({
        rule: createRuleResponse({
          kind: 'alert',
          recovery_strategy: 'no_breach',
          query: {
            format: 'standalone',
            breach: { query: 'FROM logs-* | LIMIT 10' },
          },
        }),
        alertEventsBatch,
      });

      const [result] = await collectStreamResults(
        step.executeStream(createPipelineStream([state]))
      );

      expect(result).toEqual({ type: 'continue', state });
    });

    it('does not create recovery events for groups that are still breaching', async () => {
      const { step, internalEsClient } = createStep();

      internalEsClient.esql.query.mockResolvedValue(
        createActiveGroupHashesResponse(['hash-1', 'hash-2'])
      );

      const alertEventsBatch = [
        createAlertEvent({ group_hash: 'hash-1' }),
        createAlertEvent({ group_hash: 'hash-2' }),
      ];

      const state = createRulePipelineState({
        rule: createRuleResponse({
          kind: 'alert',
          recovery_strategy: 'no_breach',
          query: {
            format: 'standalone',
            breach: { query: 'FROM logs-* | LIMIT 10' },
          },
        }),
        alertEventsBatch,
      });

      const [result] = await collectStreamResults(
        step.executeStream(createPipelineStream([state]))
      );

      expect(result.type).toBe('continue');
      const resultEvents = result.state.alertEventsBatch!;
      expect(resultEvents).toHaveLength(2);
      expect(resultEvents.every((e: AlertEvent) => e.status === 'breached')).toBe(true);
    });

    it('creates recovery events for all active groups when no breached events exist', async () => {
      const { step, internalEsClient } = createStep();

      internalEsClient.esql.query.mockResolvedValue(
        createActiveGroupHashesResponse(['hash-1', 'hash-2'])
      );

      const state = createRulePipelineState({
        rule: createRuleResponse({
          kind: 'alert',
          recovery_strategy: 'no_breach',
          query: {
            format: 'standalone',
            breach: { query: 'FROM logs-* | LIMIT 10' },
          },
        }),
        alertEventsBatch: [],
      });

      const [result] = await collectStreamResults(
        step.executeStream(createPipelineStream([state]))
      );

      expect(result.type).toBe('continue');
      const alertEvents = result.state.alertEventsBatch!;
      expect(alertEvents).toHaveLength(2);
      expect(alertEvents.every((e: AlertEvent) => e.status === 'recovered')).toBe(true);
    });

    describe('with a data-presence result', () => {
      it('recovers only absent groups that still have data', async () => {
        const { step, internalEsClient } = createStep();

        internalEsClient.esql.query.mockResolvedValue(
          createActiveGroupHashesResponse(['hash-1', 'hash-2', 'hash-3'])
        );

        // hash-1 is breaching, hash-2 is absent with data (recovers),
        // hash-3 is absent with no data (left for the no-data step).
        const state = createRulePipelineState({
          rule: createRuleResponse({
            kind: 'alert',
            recovery_strategy: 'no_breach',
            no_data_strategy: 'emit',
            query: {
              format: 'standalone',
              breach: { query: 'FROM logs-* | LIMIT 10' },
              no_data: { query: 'FROM logs-* | STATS COUNT(*) BY host.name' },
            },
          }),
          alertEventsBatch: [createAlertEvent({ group_hash: 'hash-1' })],
          dataPresentGroupHashes: new Set(['hash-2']),
        });

        const [result] = await collectStreamResults(
          step.executeStream(createPipelineStream([state]))
        );

        expect(result.type).toBe('continue');
        const alertEvents = result.state.alertEventsBatch!;
        expect(alertEvents).toHaveLength(2);
        expect(alertEvents[0].status).toBe('breached');
        expect(alertEvents[0].group_hash).toBe('hash-1');
        expect(alertEvents[1].status).toBe('recovered');
        expect(alertEvents[1].group_hash).toBe('hash-2');
      });

      it('recovers all absent groups when no data-presence result is available (fallback)', async () => {
        const { step, internalEsClient } = createStep();

        internalEsClient.esql.query.mockResolvedValue(
          createActiveGroupHashesResponse(['hash-1', 'hash-2'])
        );

        // No `dataPresentGroupHashes` in state (e.g. no_data_strategy: 'none').
        const state = createRulePipelineState({
          rule: createRuleResponse({
            kind: 'alert',
            recovery_strategy: 'no_breach',
            query: {
              format: 'standalone',
              breach: { query: 'FROM logs-* | LIMIT 10' },
            },
          }),
          alertEventsBatch: [createAlertEvent({ group_hash: 'hash-1' })],
        });

        const [result] = await collectStreamResults(
          step.executeStream(createPipelineStream([state]))
        );

        expect(result.type).toBe('continue');
        const alertEvents = result.state.alertEventsBatch!;
        expect(alertEvents).toHaveLength(2);
        expect(alertEvents[0].status).toBe('breached');
        expect(alertEvents[0].group_hash).toBe('hash-1');
        expect(alertEvents[1].status).toBe('recovered');
        expect(alertEvents[1].group_hash).toBe('hash-2');
      });
    });
  });

  describe('composed format', () => {
    it('does not execute a custom recovery query when composed rule recovery strategy is no_breach', async () => {
      const { step, internalEsClient, scopedEsClient } = createStep();

      internalEsClient.esql.query.mockResolvedValue(
        createActiveGroupHashesResponse(['hash-1', 'hash-2'])
      );

      const state = createRulePipelineState({
        rule: createRuleResponse({
          kind: 'alert',
          recovery_strategy: 'no_breach',
          query: {
            format: 'composed',
            base: 'FROM metrics-*',
            breach: { segment: 'WHERE cpu > 0.9' },
          },
        }),
        alertEventsBatch: [createAlertEvent({ group_hash: 'hash-1' })],
      });

      const [result] = await collectStreamResults(
        step.executeStream(createPipelineStream([state]))
      );

      expect(scopedEsClient.esql.query).not.toHaveBeenCalled();
      expect(result.type).toBe('continue');
      const alertEvents = result.state.alertEventsBatch!;
      expect(alertEvents).toHaveLength(2);
      expect(alertEvents[0].status).toBe('breached');
      expect(alertEvents[0].group_hash).toBe('hash-1');
      expect(alertEvents[1].status).toBe('recovered');
      expect(alertEvents[1].group_hash).toBe('hash-2');
    });

    it('executes base+recovery segment as the recovery query for composed format rules', async () => {
      const { step, internalEsClient, scopedEsClient } = createStep();

      internalEsClient.esql.query.mockResolvedValue(
        createActiveGroupHashesResponse(['hash-a', 'hash-b'])
      );

      scopedEsClient.esql.query.mockResolvedValue(
        createEsqlResponse([{ name: 'host.name', type: 'keyword' }], [['host-recovered']])
      );

      const state = createRulePipelineState({
        rule: createRuleResponse({
          kind: 'alert',
          recovery_strategy: 'query',
          query: {
            format: 'composed',
            base: 'FROM metrics-* | STATS AVG(cpu) BY host.name',
            breach: { segment: 'WHERE AVG(cpu) > 0.9' },
            recovery: { segment: 'WHERE AVG(cpu) < 0.5' },
          },
        }),
        alertEventsBatch: [],
      });

      const [result] = await collectStreamResults(
        step.executeStream(createPipelineStream([state]))
      );

      expect(scopedEsClient.esql.query).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'FROM metrics-* | STATS AVG(cpu) BY host.name | WHERE AVG(cpu) < 0.5',
        }),
        expect.any(Object)
      );
      expect(result.type).toBe('continue');
      const alertEvents = result.state.alertEventsBatch!;
      expect(alertEvents.every((e: AlertEvent) => e.status === 'recovered')).toBe(true);
    });
  });

  describe('query strategy', () => {
    it('executes the recovery query and creates events for matching active groups', async () => {
      const { step, internalEsClient, scopedEsClient } = createStep();

      internalEsClient.esql.query.mockResolvedValue(
        createActiveGroupHashesResponse(['hash-a', 'hash-b', 'hash-c'])
      );

      scopedEsClient.esql.query.mockResolvedValue(
        createEsqlResponse(
          [{ name: 'host.name', type: 'keyword' }],
          [['recovery-host-1'], ['recovery-host-2']]
        )
      );

      const state = createRulePipelineState({
        rule: createRuleResponse({
          kind: 'alert',
          recovery_strategy: 'query',
          query: {
            format: 'standalone',
            breach: { query: 'FROM logs-* | LIMIT 10' },
            recovery: { query: 'FROM logs-* | WHERE recovered = true' },
          },
        }),
        alertEventsBatch: [],
      });

      const [result] = await collectStreamResults(
        step.executeStream(createPipelineStream([state]))
      );

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
          recovery_strategy: 'query',
          query: {
            format: 'standalone',
            breach: { query: 'FROM logs-* | LIMIT 10' },
            recovery: { query: 'FROM logs-* | WHERE ok = true' },
          },
        }),
        alertEventsBatch: [],
      });

      await collectStreamResults(step.executeStream(createPipelineStream([state])));

      expect(internalEsClient.esql.query).toHaveBeenCalledTimes(1);
      expect(scopedEsClient.esql.query).toHaveBeenCalledTimes(1);
    });

    it('returns no recovery events when recovery query returns empty results', async () => {
      const { step, internalEsClient, scopedEsClient } = createStep();

      internalEsClient.esql.query.mockResolvedValue(
        createActiveGroupHashesResponse(['hash-1', 'hash-2'])
      );

      scopedEsClient.esql.query.mockResolvedValue(createEsqlResponse([], []));

      const breachedEvents = [createAlertEvent({ group_hash: 'hash-3' })];

      const state = createRulePipelineState({
        rule: createRuleResponse({
          kind: 'alert',
          recovery_strategy: 'query',
          query: {
            format: 'standalone',
            breach: { query: 'FROM logs-* | LIMIT 10' },
            recovery: { query: 'FROM logs-* | WHERE recovered = true' },
          },
        }),
        alertEventsBatch: breachedEvents,
      });

      const [result] = await collectStreamResults(
        step.executeStream(createPipelineStream([state]))
      );

      expect(result.type).toBe('continue');
      const alertEvents = result.state.alertEventsBatch!;
      expect(alertEvents).toHaveLength(1);
      expect(alertEvents[0].group_hash).toBe('hash-3');
    });

    it('only recovers active groups that match the recovery query results', async () => {
      const { step, internalEsClient, scopedEsClient } = createStep();

      internalEsClient.esql.query.mockResolvedValue(
        createActiveGroupHashesResponse(['hash-a', 'hash-b'])
      );

      scopedEsClient.esql.query.mockResolvedValue(
        createEsqlResponse([{ name: 'host.name', type: 'keyword' }], [['host-recovered']])
      );

      const state = createRulePipelineState({
        rule: createRuleResponse({
          kind: 'alert',
          recovery_strategy: 'query',
          grouping: { fields: ['host.name'] },
          query: {
            format: 'standalone',
            breach: { query: 'FROM logs-* | LIMIT 10' },
            recovery: {
              query: 'FROM logs-* | WHERE error_count == 0 | STATS count(*) BY host.name',
            },
          },
        }),
        alertEventsBatch: [],
      });

      const [result] = await collectStreamResults(
        step.executeStream(createPipelineStream([state]))
      );

      expect(result.type).toBe('continue');
      const alertEvents = result.state.alertEventsBatch!;
      expect(alertEvents.every((e: AlertEvent) => e.status === 'recovered')).toBe(true);
    });

    it('excludes breached groups from recovery even when the recovery query matches them (breach wins)', async () => {
      const { step, internalEsClient, scopedEsClient } = createStep();

      const groupingFields = ['host.name'];
      const hashX = buildGroupHash({
        rowDoc: { 'host.name': 'host-x' },
        groupKeyFields: groupingFields,
        fallbackSeed: 'unused',
      });
      const hashY = buildGroupHash({
        rowDoc: { 'host.name': 'host-y' },
        groupKeyFields: groupingFields,
        fallbackSeed: 'unused',
      });

      internalEsClient.esql.query.mockResolvedValue(
        createActiveGroupHashesResponse([hashX, hashY])
      );

      // The recovery query matches BOTH active groups, but host-x is also
      // breaching this run, so breach must win for host-x.
      scopedEsClient.esql.query.mockResolvedValue(
        createEsqlResponse([{ name: 'host.name', type: 'keyword' }], [['host-x'], ['host-y']])
      );

      const state = createRulePipelineState({
        rule: createRuleResponse({
          kind: 'alert',
          recovery_strategy: 'query',
          grouping: { fields: groupingFields },
          query: {
            format: 'standalone',
            breach: { query: 'FROM logs-* | LIMIT 10' },
            recovery: { query: 'FROM logs-* | STATS count(*) BY host.name' },
          },
        }),
        alertEventsBatch: [createAlertEvent({ group_hash: hashX, status: 'breached' })],
      });

      const [result] = await collectStreamResults(
        step.executeStream(createPipelineStream([state]))
      );

      expect(result.type).toBe('continue');
      const alertEvents = result.state.alertEventsBatch!;
      const byGroup = Object.fromEntries(alertEvents.map((e) => [e.group_hash, e.status]));
      // host-x stays breached (breach wins); only host-y recovers.
      expect(byGroup[hashX]).toBe('breached');
      expect(byGroup[hashY]).toBe('recovered');
      expect(alertEvents.filter((e) => e.status === 'recovered')).toHaveLength(1);
    });

    it('preserves breached events alongside query recovery events', async () => {
      const { step, internalEsClient, scopedEsClient } = createStep();

      internalEsClient.esql.query.mockResolvedValue(createActiveGroupHashesResponse(['hash-1']));

      scopedEsClient.esql.query.mockResolvedValue(createEsqlResponse([], []));

      const breachedEvents = [createAlertEvent({ group_hash: 'hash-new' })];

      const state = createRulePipelineState({
        rule: createRuleResponse({
          kind: 'alert',
          recovery_strategy: 'query',
          query: {
            format: 'standalone',
            breach: { query: 'FROM logs-* | LIMIT 10' },
            recovery: { query: 'FROM logs-*' },
          },
        }),
        alertEventsBatch: breachedEvents,
      });

      const [result] = await collectStreamResults(
        step.executeStream(createPipelineStream([state]))
      );

      expect(result.type).toBe('continue');
      expect(result.state.alertEventsBatch![0].status).toBe('breached');
      expect(result.state.alertEventsBatch![0].group_hash).toBe('hash-new');
    });

    it('marks ResponseError(400) recovery query errors as TaskErrorSource.USER', async () => {
      const { step, internalEsClient, scopedEsClient } = createStep();

      internalEsClient.esql.query.mockResolvedValue(createActiveGroupHashesResponse(['hash-1']));
      scopedEsClient.esql.query.mockRejectedValue(
        // @ts-expect-error: Not all params are needed for the test.
        new errors.ResponseError({ statusCode: 400 })
      );

      const state = createRulePipelineState({
        rule: createRuleResponse({
          kind: 'alert',
          recovery_strategy: 'query',
          query: {
            format: 'standalone',
            breach: { query: 'FROM logs-* | LIMIT 10' },
            recovery: { query: 'FROM logs-* | WHERE invalid syntax' },
          },
        }),
        alertEventsBatch: [],
      });

      const error = await getStepError(step, state);

      expect(error).toBeInstanceOf(Error);
      expect(getErrorSource(error!)).toBe(TaskErrorSource.USER);
    });

    it('does not mark ResponseError(503) recovery query errors as TaskErrorSource.USER', async () => {
      const { step, internalEsClient, scopedEsClient } = createStep();

      internalEsClient.esql.query.mockResolvedValue(createActiveGroupHashesResponse(['hash-1']));
      scopedEsClient.esql.query.mockRejectedValue(
        new errors.ResponseError({ statusCode: 503 } as DiagnosticResult)
      );

      const state = createRulePipelineState({
        rule: createRuleResponse({
          kind: 'alert',
          recovery_strategy: 'query',
          query: {
            format: 'standalone',
            breach: { query: 'FROM logs-* | LIMIT 10' },
            recovery: { query: 'FROM logs-*' },
          },
        }),
        alertEventsBatch: [],
      });

      const error = await getStepError(step, state);

      expect(error).toBeInstanceOf(Error);
      expect(getErrorSource(error!)).toBeUndefined();
    });

    it('does not mark plain recovery query errors as TaskErrorSource.USER', async () => {
      const { step, internalEsClient, scopedEsClient } = createStep();

      internalEsClient.esql.query.mockResolvedValue(createActiveGroupHashesResponse(['hash-1']));
      scopedEsClient.esql.query.mockRejectedValue(new Error('connection reset'));

      const state = createRulePipelineState({
        rule: createRuleResponse({
          kind: 'alert',
          recovery_strategy: 'query',
          query: {
            format: 'standalone',
            breach: { query: 'FROM logs-* | LIMIT 10' },
            recovery: { query: 'FROM logs-*' },
          },
        }),
        alertEventsBatch: [],
      });

      const error = await getStepError(step, state);

      expect(error).toBeInstanceOf(Error);
      expect(getErrorSource(error!)).toBeUndefined();
    });
  });

  describe('abort signal', () => {
    it('passes executionContext signal to ES client', async () => {
      const { step, internalEsClient } = createStep();

      internalEsClient.esql.query.mockResolvedValue(createActiveGroupHashesResponse([]));

      const abortController = new AbortController();
      const input = createRuleExecutionInput({ abortSignal: abortController.signal });
      const state = createRulePipelineState({
        input,
        rule: createRuleResponse({
          kind: 'alert',
          recovery_strategy: 'no_breach',
          query: {
            format: 'standalone',
            breach: { query: 'FROM logs-* | LIMIT 10' },
          },
        }),
        alertEventsBatch: [createAlertEvent()],
      });

      await collectStreamResults(step.executeStream(createPipelineStream([state])));

      expect(internalEsClient.esql.query).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ signal: abortController.signal })
      );
    });
  });

  describe('state guards', () => {
    it('halts with state_not_ready when rule is missing from state', async () => {
      const { step } = createStep();

      const state = createRulePipelineState({
        alertEventsBatch: [createAlertEvent()],
      });

      const [result] = await collectStreamResults(
        step.executeStream(createPipelineStream([state]))
      );

      expect(result).toEqual({ type: 'halt', reason: 'state_not_ready', state });
    });

    it('halts with state_not_ready when alertEventsBatch is missing from state', async () => {
      const { step } = createStep();

      const state = createRulePipelineState({ rule: createRuleResponse() });

      const [result] = await collectStreamResults(
        step.executeStream(createPipelineStream([state]))
      );

      expect(result).toEqual({ type: 'halt', reason: 'state_not_ready', state });
    });
  });
});
