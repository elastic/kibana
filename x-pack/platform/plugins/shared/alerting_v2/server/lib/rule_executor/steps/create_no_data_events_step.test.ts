/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Tests for the no-data executor step.
 *
 * Hybrid layout:
 *   - Outer groups: `no_data_strategy` (the rule's primary configuration knob).
 *   - Inner groups: the three scenarios from the rule-execution matrix doc,
 *     for a previously active group `host.name = abc` that does not appear
 *     in the breach batch this run.
 *
 * | Scenario | avg_cpu | breach query  | recovery query (avg_cpu < 80) | data presence |
 * | -------- | ------- | ------------- | ----------------------------- | ------------- |
 * | A        | 78%     | not breaching | matches                       | present       |
 * | B        | 85%     | not breaching | does NOT match                | present       |
 * | C        | absent  | not breaching | absent                        | absent        |
 *
 * Each scenario is exercised against the three `recovery_strategy` columns
 * (`no_breach`, `query`, `none`). Scenarios A and B share outcomes across
 * the no_data_strategy values that opt into the no-data check (data is
 * present, so the no-data partition is empty); Scenario C is where each
 * no_data_strategy diverges.
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
import type { AlertEvent } from '../../../resources/datastreams/alert_events';
import type { RuleResponse } from '../../rules_client';
import { CreateNoDataEventsStep } from './create_no_data_events_step';

const HOST = 'abc';

const groupingFields = ['host.name'];

const hostHash = buildGroupHash({
  rowDoc: { 'host.name': HOST },
  groupKeyFields: groupingFields,
  fallbackSeed: 'unused',
});

describe('CreateNoDataEventsStep', () => {
  const { loggerService } = createLoggerService();

  function createStep() {
    const internal = createQueryService();
    const scoped = createQueryService();
    const step = new CreateNoDataEventsStep(
      loggerService,
      internal.queryService,
      scoped.queryService
    );
    return { step, internalEsClient: internal.mockEsClient, scopedEsClient: scoped.mockEsClient };
  }

  // The `host.name = abc` group was previously active and is the subject of
  // every scenario. The active-groups query the step runs only projects
  // `group_hash`, so we mock that single column.
  function mockActiveAbcGroup(internalEsClient: ReturnType<typeof createStep>['internalEsClient']) {
    internalEsClient.esql.query.mockResolvedValue(
      createEsqlResponse([{ name: 'group_hash', type: 'keyword' }], [[hostHash]])
    );
  }

  function mockNoDataQueryHasHost(
    scopedEsClient: ReturnType<typeof createStep>['scopedEsClient'],
    present: boolean
  ) {
    scopedEsClient.esql.query.mockResolvedValue(
      present
        ? createEsqlResponse([{ name: 'host.name', type: 'keyword' }], [[HOST]])
        : createEsqlResponse([], [])
    );
  }

  function buildRule(overrides: Partial<RuleResponse> = {}): RuleResponse {
    return createRuleResponse({
      kind: 'alert',
      grouping: { fields: groupingFields },
      query: {
        format: 'standalone',
        breach: { query: 'FROM metrics-* | WHERE avg_cpu > 90' },
        recovery: { query: 'FROM metrics-* | WHERE avg_cpu < 80' },
        no_data: { query: 'FROM metrics-* | STATS COUNT(*) BY host.name' },
      },
      ...overrides,
    });
  }

  function recoveredEvent(): AlertEvent {
    return createAlertEvent({ group_hash: hostHash, status: 'recovered' });
  }

  async function runStep({
    step,
    rule,
    incomingEvents,
  }: {
    step: CreateNoDataEventsStep;
    rule: RuleResponse;
    incomingEvents: AlertEvent[];
  }) {
    const state = createRulePipelineState({ rule, alertEventsBatch: incomingEvents });
    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));
    return { result, initialState: state };
  }

  function statusesByGroup(
    events: ReadonlyArray<AlertEvent>
  ): Record<string, AlertEvent['status']> {
    return Object.fromEntries(events.map((e) => [e.group_hash, e.status]));
  }

  // ──────────────────────────────────────────────────────────────────────
  // no_data_strategy: emit
  //
  // Emit a `no_data` rule event for active-but-absent groups. Replaces any
  // upstream `recovered` event for those same groups so the FSM sees the
  // most-specific outcome. Data-present groups are handled by recovery.
  // ──────────────────────────────────────────────────────────────────────
  describe("no_data_strategy: 'emit'", () => {
    describe('Scenario A — avg_cpu = 78% (recovery condition met, host present)', () => {
      it('recovery_strategy: no_breach — passes through the upstream recovered event', async () => {
        const { step, internalEsClient, scopedEsClient } = createStep();

        mockActiveAbcGroup(internalEsClient);
        mockNoDataQueryHasHost(scopedEsClient, true);

        const incoming = recoveredEvent();
        const { result } = await runStep({
          step,
          rule: buildRule({ recovery_strategy: 'no_breach', no_data_strategy: 'emit' }),
          incomingEvents: [incoming],
        });

        expect(result.state.alertEventsBatch).toEqual([incoming]);
      });

      it('recovery_strategy: query — passes through the recovery-query-matched event', async () => {
        const { step, internalEsClient, scopedEsClient } = createStep();

        mockActiveAbcGroup(internalEsClient);
        mockNoDataQueryHasHost(scopedEsClient, true);

        const incoming = recoveredEvent();
        const { result } = await runStep({
          step,
          rule: buildRule({ recovery_strategy: 'query', no_data_strategy: 'emit' }),
          incomingEvents: [incoming],
        });

        expect(result.state.alertEventsBatch).toEqual([incoming]);
      });

      it('recovery_strategy: none — UNKNOWN_E: writes no event (recovery is opted out)', async () => {
        const { step, internalEsClient, scopedEsClient } = createStep();

        mockActiveAbcGroup(internalEsClient);
        mockNoDataQueryHasHost(scopedEsClient, true);

        const { result, initialState } = await runStep({
          step,
          rule: buildRule({ recovery_strategy: 'none', no_data_strategy: 'emit' }),
          incomingEvents: [],
        });

        expect(result.state.alertEventsBatch).toEqual(initialState.alertEventsBatch);
      });
    });

    describe('Scenario B — avg_cpu = 85% (limbo, host present)', () => {
      it('recovery_strategy: no_breach — passes through the upstream recovered event (no_breach ignores cpu)', async () => {
        const { step, internalEsClient, scopedEsClient } = createStep();

        mockActiveAbcGroup(internalEsClient);
        mockNoDataQueryHasHost(scopedEsClient, true);

        const incoming = recoveredEvent();
        const { result } = await runStep({
          step,
          rule: buildRule({ recovery_strategy: 'no_breach', no_data_strategy: 'emit' }),
          incomingEvents: [incoming],
        });

        expect(result.state.alertEventsBatch).toEqual([incoming]);
      });

      it('recovery_strategy: query — UNKNOWN_D: re-asserts breached so the episode stays alive', async () => {
        const { step, internalEsClient, scopedEsClient } = createStep();

        mockActiveAbcGroup(internalEsClient);
        mockNoDataQueryHasHost(scopedEsClient, true);

        // 85% does not match the recovery condition (< 80), so no recovered
        // event is emitted upstream — the data-present partition fills the gap.
        const { result } = await runStep({
          step,
          rule: buildRule({ recovery_strategy: 'query', no_data_strategy: 'emit' }),
          incomingEvents: [],
        });

        const events = result.state.alertEventsBatch!;
        expect(events).toHaveLength(1);
        expect(events[0]).toMatchObject({
          group_hash: hostHash,
          status: 'breached',
          source: 'internal',
          data: { 'host.name': HOST },
        });
      });

      it('recovery_strategy: none — UNKNOWN_E: writes no event (recovery is opted out)', async () => {
        const { step, internalEsClient, scopedEsClient } = createStep();

        mockActiveAbcGroup(internalEsClient);
        mockNoDataQueryHasHost(scopedEsClient, true);

        const { result, initialState } = await runStep({
          step,
          rule: buildRule({ recovery_strategy: 'none', no_data_strategy: 'emit' }),
          incomingEvents: [],
        });

        expect(result.state.alertEventsBatch).toEqual(initialState.alertEventsBatch);
      });
    });

    describe('Scenario C — host absent (no-data path)', () => {
      it('recovery_strategy: no_breach — replaces the upstream recovered event with a no_data event', async () => {
        const { step, internalEsClient, scopedEsClient } = createStep();

        mockActiveAbcGroup(internalEsClient);
        mockNoDataQueryHasHost(scopedEsClient, false);

        const { result } = await runStep({
          step,
          rule: buildRule({ recovery_strategy: 'no_breach', no_data_strategy: 'emit' }),
          incomingEvents: [recoveredEvent()],
        });

        expect(statusesByGroup(result.state.alertEventsBatch!)).toEqual({ [hostHash]: 'no_data' });
      });

      it('recovery_strategy: query — emits a no_data event (recovery query cannot match an absent host)', async () => {
        const { step, internalEsClient, scopedEsClient } = createStep();

        mockActiveAbcGroup(internalEsClient);
        mockNoDataQueryHasHost(scopedEsClient, false);

        const { result } = await runStep({
          step,
          rule: buildRule({ recovery_strategy: 'query', no_data_strategy: 'emit' }),
          incomingEvents: [],
        });

        expect(statusesByGroup(result.state.alertEventsBatch!)).toEqual({ [hostHash]: 'no_data' });
      });

      it('recovery_strategy: none — emits a no_data event even though recovery is disabled', async () => {
        const { step, internalEsClient, scopedEsClient } = createStep();

        mockActiveAbcGroup(internalEsClient);
        mockNoDataQueryHasHost(scopedEsClient, false);

        const { result } = await runStep({
          step,
          rule: buildRule({ recovery_strategy: 'none', no_data_strategy: 'emit' }),
          incomingEvents: [],
        });

        expect(statusesByGroup(result.state.alertEventsBatch!)).toEqual({ [hostHash]: 'no_data' });
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // no_data_strategy: last_known_status
  //
  // Emits the same `no_data` rule event as `emit`. The director branches on
  // `rule.no_data_strategy` when computing the next episode status: `'emit'`
  // advances to a `'no_data'` episode status; `'last_known_status'` preserves
  // the prior status. See `BasicTransitionStrategy.getNextStatusForNoData`
  // and `director.test.ts` for the FSM-side coverage. Tested only under
  // Scenario C because Scenarios A/B don't produce no-data outcomes.
  // ──────────────────────────────────────────────────────────────────────
  describe("no_data_strategy: 'last_known_status'", () => {
    describe('Scenario C — host absent', () => {
      it.each([['no_breach'], ['query'], ['none']] as const)(
        'recovery_strategy: %s — emits a no_data event (FSM preserves the prior episode status)',
        async (recovery_strategy) => {
          const { step, internalEsClient, scopedEsClient } = createStep();

          mockActiveAbcGroup(internalEsClient);
          mockNoDataQueryHasHost(scopedEsClient, false);

          const incomingEvents = recovery_strategy === 'no_breach' ? [recoveredEvent()] : [];

          const { result } = await runStep({
            step,
            rule: buildRule({ recovery_strategy, no_data_strategy: 'last_known_status' }),
            incomingEvents,
          });

          expect(statusesByGroup(result.state.alertEventsBatch!)).toEqual({
            [hostHash]: 'no_data',
          });
        }
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // no_data_strategy: recover
  //
  // Treat absence as recovery. When recovery has already been emitted
  // upstream we leave it alone (idempotent); when recovery is disabled we
  // emit the recovered event ourselves.
  // ──────────────────────────────────────────────────────────────────────
  describe("no_data_strategy: 'recover'", () => {
    describe('Scenario A — avg_cpu = 78% (recovery condition met, host present)', () => {
      it('recovery_strategy: no_breach — passes through the upstream recovered event', async () => {
        const { step, internalEsClient, scopedEsClient } = createStep();

        mockActiveAbcGroup(internalEsClient);
        mockNoDataQueryHasHost(scopedEsClient, true);

        const incoming = recoveredEvent();
        const { result } = await runStep({
          step,
          rule: buildRule({ recovery_strategy: 'no_breach', no_data_strategy: 'recover' }),
          incomingEvents: [incoming],
        });

        expect(result.state.alertEventsBatch).toEqual([incoming]);
      });

      it('recovery_strategy: query — passes through the recovery-query-matched event', async () => {
        const { step, internalEsClient, scopedEsClient } = createStep();

        mockActiveAbcGroup(internalEsClient);
        mockNoDataQueryHasHost(scopedEsClient, true);

        const incoming = recoveredEvent();
        const { result } = await runStep({
          step,
          rule: buildRule({ recovery_strategy: 'query', no_data_strategy: 'recover' }),
          incomingEvents: [incoming],
        });

        expect(result.state.alertEventsBatch).toEqual([incoming]);
      });

      it('recovery_strategy: none — UNKNOWN_E: writes no event (data is present, no-data path is not taken)', async () => {
        const { step, internalEsClient, scopedEsClient } = createStep();

        mockActiveAbcGroup(internalEsClient);
        mockNoDataQueryHasHost(scopedEsClient, true);

        const { result, initialState } = await runStep({
          step,
          rule: buildRule({ recovery_strategy: 'none', no_data_strategy: 'recover' }),
          incomingEvents: [],
        });

        expect(result.state.alertEventsBatch).toEqual(initialState.alertEventsBatch);
      });
    });

    describe('Scenario B — avg_cpu = 85% (limbo, host present)', () => {
      it('recovery_strategy: query — UNKNOWN_D: re-asserts breached (data is present, no-data path is not taken)', async () => {
        const { step, internalEsClient, scopedEsClient } = createStep();

        mockActiveAbcGroup(internalEsClient);
        mockNoDataQueryHasHost(scopedEsClient, true);

        const { result } = await runStep({
          step,
          rule: buildRule({ recovery_strategy: 'query', no_data_strategy: 'recover' }),
          incomingEvents: [],
        });

        const events = result.state.alertEventsBatch!;
        expect(events).toHaveLength(1);
        expect(events[0]).toMatchObject({
          group_hash: hostHash,
          status: 'breached',
          source: 'internal',
          data: { 'host.name': HOST },
        });
      });
    });

    describe('Scenario C — host absent', () => {
      it('recovery_strategy: no_breach — leaves the upstream recovered event in place (idempotent)', async () => {
        const { step, internalEsClient, scopedEsClient } = createStep();

        mockActiveAbcGroup(internalEsClient);
        mockNoDataQueryHasHost(scopedEsClient, false);

        const incoming = recoveredEvent();
        const { result } = await runStep({
          step,
          rule: buildRule({ recovery_strategy: 'no_breach', no_data_strategy: 'recover' }),
          incomingEvents: [incoming],
        });

        expect(result.state.alertEventsBatch).toEqual([incoming]);
      });

      it('recovery_strategy: none — emits a recovered event because no upstream step did', async () => {
        const { step, internalEsClient, scopedEsClient } = createStep();

        mockActiveAbcGroup(internalEsClient);
        mockNoDataQueryHasHost(scopedEsClient, false);

        const { result } = await runStep({
          step,
          rule: buildRule({ recovery_strategy: 'none', no_data_strategy: 'recover' }),
          incomingEvents: [],
        });

        expect(statusesByGroup(result.state.alertEventsBatch!)).toEqual({
          [hostHash]: 'recovered',
        });
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // no_data_strategy: 'none' (or omitted)
  //
  // No-data handling is opted out entirely. The step short-circuits before
  // running the no-data query; recovery events from the upstream step are
  // the final outcome.
  // ──────────────────────────────────────────────────────────────────────
  describe("no_data_strategy: 'none'", () => {
    describe('Scenario A — avg_cpu = 78% (recovery condition met, host present)', () => {
      it('recovery_strategy: no_breach — short-circuits and passes through the upstream recovered event', async () => {
        const { step, internalEsClient, scopedEsClient } = createStep();

        const incoming = recoveredEvent();
        const { result } = await runStep({
          step,
          rule: buildRule({ recovery_strategy: 'no_breach', no_data_strategy: 'none' }),
          incomingEvents: [incoming],
        });

        expect(internalEsClient.esql.query).not.toHaveBeenCalled();
        expect(scopedEsClient.esql.query).not.toHaveBeenCalled();
        expect(result.state.alertEventsBatch).toEqual([incoming]);
      });
    });

    describe('Scenario C — host absent', () => {
      it('recovery_strategy: none — UNKNOWN_E: writes no event (both strategies are off)', async () => {
        const { step, internalEsClient, scopedEsClient } = createStep();

        const { result, initialState } = await runStep({
          step,
          rule: buildRule({ recovery_strategy: 'none', no_data_strategy: 'none' }),
          incomingEvents: [],
        });

        expect(internalEsClient.esql.query).not.toHaveBeenCalled();
        expect(scopedEsClient.esql.query).not.toHaveBeenCalled();
        expect(result.state.alertEventsBatch).toEqual(initialState.alertEventsBatch);
      });
    });

    it("treats an omitted no_data_strategy the same as 'none' (short-circuits)", async () => {
      const { step, internalEsClient, scopedEsClient } = createStep();

      const incoming = recoveredEvent();
      const { result } = await runStep({
        step,
        rule: buildRule({ recovery_strategy: 'no_breach', no_data_strategy: undefined }),
        incomingEvents: [incoming],
      });

      expect(internalEsClient.esql.query).not.toHaveBeenCalled();
      expect(scopedEsClient.esql.query).not.toHaveBeenCalled();
      expect(result.state.alertEventsBatch).toEqual([incoming]);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // Composed format: `base` is the data-presence query.
  // Replays Scenario C under composed format to confirm parity.
  // ──────────────────────────────────────────────────────────────────────
  describe('composed format', () => {
    it("Scenario C — uses `base` as the data-presence query and emits no_data when the group isn't in the result", async () => {
      const { step, internalEsClient, scopedEsClient } = createStep();

      mockActiveAbcGroup(internalEsClient);
      // Absent from `base` ⇒ no data.
      scopedEsClient.esql.query.mockResolvedValue(createEsqlResponse([], []));

      const baseQuery = 'FROM metrics-* | STATS AVG(cpu) BY host.name';
      const composedRule = createRuleResponse({
        kind: 'alert',
        recovery_strategy: 'no_breach',
        no_data_strategy: 'emit',
        grouping: { fields: groupingFields },
        query: {
          format: 'composed',
          base: baseQuery,
          breach: { segment: 'WHERE AVG(cpu) > 0.9' },
        },
      });

      const { result } = await runStep({
        step,
        rule: composedRule,
        incomingEvents: [recoveredEvent()],
      });

      expect(scopedEsClient.esql.query).toHaveBeenCalledWith(
        expect.objectContaining({ query: baseQuery }),
        expect.any(Object)
      );
      expect(statusesByGroup(result.state.alertEventsBatch!)).toEqual({ [hostHash]: 'no_data' });
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // Step plumbing: short-circuits, defensive guards, ES errors, abort, state.
  // These aren't part of the matrix but are required of every executor step.
  // ──────────────────────────────────────────────────────────────────────
  describe('step plumbing', () => {
    describe('short-circuits', () => {
      it('skips for non-alert rules (signal rules have no episode lifecycle)', async () => {
        const { step, internalEsClient, scopedEsClient } = createStep();

        const { result, initialState } = await runStep({
          step,
          rule: createRuleResponse({ kind: 'signal', no_data_strategy: 'emit' }),
          incomingEvents: [createAlertEvent()],
        });

        expect(internalEsClient.esql.query).not.toHaveBeenCalled();
        expect(scopedEsClient.esql.query).not.toHaveBeenCalled();
        expect(result.state.alertEventsBatch).toEqual(initialState.alertEventsBatch);
      });

      it('does not query the no-data ES|QL when there are no active groups for the rule', async () => {
        const { step, internalEsClient, scopedEsClient } = createStep();

        internalEsClient.esql.query.mockResolvedValue(
          createEsqlResponse([{ name: 'group_hash', type: 'keyword' }], [])
        );

        const { result } = await runStep({
          step,
          rule: buildRule({ recovery_strategy: 'no_breach', no_data_strategy: 'emit' }),
          incomingEvents: [],
        });

        expect(internalEsClient.esql.query).toHaveBeenCalledTimes(1);
        expect(scopedEsClient.esql.query).not.toHaveBeenCalled();
        expect(result.state.alertEventsBatch).toEqual([]);
      });

      it('skips when every active group is still breaching (no candidates left for the no-data check)', async () => {
        const { step, internalEsClient, scopedEsClient } = createStep();

        mockActiveAbcGroup(internalEsClient);

        const breached = createAlertEvent({ group_hash: hostHash, status: 'breached' });
        const { result } = await runStep({
          step,
          rule: buildRule({ recovery_strategy: 'no_breach', no_data_strategy: 'emit' }),
          incomingEvents: [breached],
        });

        expect(scopedEsClient.esql.query).not.toHaveBeenCalled();
        expect(result.state.alertEventsBatch).toEqual([breached]);
      });
    });

    describe('defensive guards', () => {
      it('skips no-data handling when a standalone rule omits the `query.no_data` block (stale saved object)', async () => {
        const { step, internalEsClient, scopedEsClient } = createStep();

        mockActiveAbcGroup(internalEsClient);

        const incoming = recoveredEvent();
        const ruleWithoutNoData = createRuleResponse({
          kind: 'alert',
          recovery_strategy: 'no_breach',
          no_data_strategy: 'emit',
          grouping: { fields: groupingFields },
          query: { format: 'standalone', breach: { query: 'FROM metrics-*' } },
        });

        const { result } = await runStep({
          step,
          rule: ruleWithoutNoData,
          incomingEvents: [incoming],
        });

        expect(scopedEsClient.esql.query).not.toHaveBeenCalled();
        expect(result.state.alertEventsBatch).toEqual([incoming]);
      });
    });

    describe('error handling', () => {
      it('surfaces ES|QL 4xx errors from the no-data query as TaskErrorSource.USER', async () => {
        const { step, internalEsClient, scopedEsClient } = createStep();

        mockActiveAbcGroup(internalEsClient);
        scopedEsClient.esql.query.mockRejectedValue(
          // @ts-expect-error: Not all params are needed for the test.
          new errors.ResponseError({ statusCode: 400 })
        );

        const state = createRulePipelineState({
          rule: buildRule({ recovery_strategy: 'no_breach', no_data_strategy: 'emit' }),
          alertEventsBatch: [],
        });

        const error = await getStepError(step, state);

        expect(error).toBeInstanceOf(Error);
        expect(getErrorSource(error!)).toBe(TaskErrorSource.USER);
      });

      it('does not classify ES|QL 5xx errors as user errors (server-side, retryable)', async () => {
        const { step, internalEsClient, scopedEsClient } = createStep();

        mockActiveAbcGroup(internalEsClient);
        scopedEsClient.esql.query.mockRejectedValue(
          new errors.ResponseError({ statusCode: 503 } as DiagnosticResult)
        );

        const state = createRulePipelineState({
          rule: buildRule({ recovery_strategy: 'no_breach', no_data_strategy: 'emit' }),
          alertEventsBatch: [],
        });

        const error = await getStepError(step, state);

        expect(error).toBeInstanceOf(Error);
        expect(getErrorSource(error!)).toBeUndefined();
      });
    });

    describe('cancellation', () => {
      it('forwards the executionContext abort signal to the active-groups ES|QL call', async () => {
        const { step, internalEsClient } = createStep();

        internalEsClient.esql.query.mockResolvedValue(
          createEsqlResponse([{ name: 'group_hash', type: 'keyword' }], [])
        );

        const abortController = new AbortController();
        const input = createRuleExecutionInput({ abortSignal: abortController.signal });

        const state = createRulePipelineState({
          input,
          rule: buildRule({ recovery_strategy: 'no_breach', no_data_strategy: 'emit' }),
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
      it('halts with state_not_ready when `rule` is missing from pipeline state', async () => {
        const { step } = createStep();

        const state = createRulePipelineState({ alertEventsBatch: [createAlertEvent()] });
        const [result] = await collectStreamResults(
          step.executeStream(createPipelineStream([state]))
        );

        expect(result).toEqual({ type: 'halt', reason: 'state_not_ready', state });
      });

      it('halts with state_not_ready when `alertEventsBatch` is missing from pipeline state', async () => {
        const { step } = createStep();

        const state = createRulePipelineState({ rule: createRuleResponse() });
        const [result] = await collectStreamResults(
          step.executeStream(createPipelineStream([state]))
        );

        expect(result).toEqual({ type: 'halt', reason: 'state_not_ready', state });
      });
    });
  });
});
