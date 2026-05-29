/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DispatcherPipeline,
  type DispatcherPipelineResult,
  parallelGroup,
} from './execution_pipeline';
import type {
  ActionPolicyId,
  DispatcherPipelineEntry,
  DispatcherStep,
  DispatcherStepOutput,
  RuleId,
} from './types';
import { createLoggerService } from '../services/logger_service/logger_service.mock';
import {
  createActionPolicy,
  createAlertEpisode,
  createAlertEpisodeSuppression,
  createDispatcherPipelineInput,
  createMockDispatcherStep,
  createRule,
} from './fixtures/test_utils';

jest.mock('./with_dispatcher_span', () => ({
  withDispatcherSpan: (_name: string, cb: () => Promise<unknown>) => cb(),
}));

/**
 * Serial-vs-parallel equivalence proof.
 *
 * This test is the gate on the parallel-group binding change. It does not
 * exercise the production binding; it exercises the {@link DispatcherPipeline}
 * primitive directly with two arrangements of the SAME deterministic mock
 * steps:
 *
 *   - `serial`   — every step is a single entry, declared in production order.
 *   - `parallel` — `fetch_episodes` and `fetch_policies` are grouped, the
 *                  rest of the order is preserved.
 *
 * For every input scenario we assert the two arrangements produce the same
 * observable outcome. "Observable" is intentionally narrow: anything that
 * downstream code (`DispatcherService.run`, `tick_summary.totals`, ES|QL
 * aggregations on `stages[].name`, `task_runner.buildRunResult`) could
 * legitimately read from a tick's result.
 *
 * Per-stage `counts` for stages WITHIN the parallel group are NOT asserted
 * to match — by design those reflect pre-group state on each child rather
 * than the cumulative serial state. The accepted artifact is documented
 * in `execution_pipeline.ts` and verified narrowly in
 * `assertWithinGroupCountsAreLocal` below so any future regression to
 * the cumulative-counts contract is caught explicitly rather than silently.
 */
describe('DispatcherPipeline serial-vs-parallel equivalence', () => {
  interface Scenario {
    readonly name: string;
    readonly steps: () => StepFixtures;
    /**
     * `true` when the scenario follows a path that runs the full
     * pipeline or halts at the same logical position in both bindings.
     * `false` when the scenario throws or halts inside the parallelized
     * group — finalState and stage set may then legitimately differ
     * (see `assertObservableEquivalence` for the precise contract).
     */
    readonly fullEquivalence: boolean;
  }

  /**
   * One mock per real step. Each mock is a pure function of its read
   * dependencies (declared in `types.ts:198-200`), so the same input
   * deterministically produces the same output regardless of execution
   * arrangement.
   */
  interface StepFixtures {
    readonly fetchEpisodes: DispatcherStep;
    readonly fetchSuppressions: DispatcherStep;
    readonly applySuppression: DispatcherStep;
    readonly fetchRules: DispatcherStep;
    readonly fetchPolicies: DispatcherStep;
    readonly evaluateMatchers: DispatcherStep;
    readonly buildGroups: DispatcherStep;
    readonly applyThrottling: DispatcherStep;
    readonly dispatch: DispatcherStep;
    readonly recordActions: DispatcherStep;
  }

  const buildSerialEntries = (s: StepFixtures): DispatcherPipelineEntry[] => [
    s.fetchEpisodes,
    s.fetchSuppressions,
    s.applySuppression,
    s.fetchRules,
    s.fetchPolicies,
    s.evaluateMatchers,
    s.buildGroups,
    s.applyThrottling,
    s.dispatch,
    s.recordActions,
  ];

  const buildParallelEntries = (s: StepFixtures): DispatcherPipelineEntry[] => [
    parallelGroup(s.fetchEpisodes, s.fetchPolicies),
    s.fetchSuppressions,
    s.applySuppression,
    s.fetchRules,
    s.evaluateMatchers,
    s.buildGroups,
    s.applyThrottling,
    s.dispatch,
    s.recordActions,
  ];

  const runWithBindings = async (
    fixtures: StepFixtures,
    binding: 'serial' | 'parallel'
  ): Promise<DispatcherPipelineResult> => {
    const { loggerService } = createLoggerService();
    const entries =
      binding === 'serial' ? buildSerialEntries(fixtures) : buildParallelEntries(fixtures);
    const pipeline = new DispatcherPipeline(loggerService, entries);
    return pipeline.execute(createDispatcherPipelineInput());
  };

  /**
   * Equivalence contract — what production consumers actually depend on:
   *
   *   1. `completed` and `haltReason`                — drive
   *      `task_runner.buildRunResult`'s decision to advance the watermark.
   *   2. The advanceable watermark                    — what
   *      `dispatcher.ts:extractAdvanceableWatermark` would extract from
   *      `finalState`. This is the ONLY field of `finalState` that
   *      flows out of the dispatcher into Task Manager state.
   *   3. The LAST stage's `counts`                    — surfaced as
   *      `tick_summary.totals`, which dashboards and ES|QL queries
   *      aggregate on directly.
   *   4. For any stage that ran in BOTH arrangements: `halted` and
   *      `error` must agree.                          — observers that
   *      filter `stages[].name` see the same per-stage outcome.
   *
   * NOT asserted: deep equality of intermediate `finalState` fields.
   * On `step_error` paths the parallel arrangement may have merged a
   * sibling's successful delta (e.g. `policies`) into `finalState`
   * before halting, while the serial arrangement halted before that
   * sibling ran. Production code never reads those intermediate
   * fields after `step_error` because the watermark is discarded
   * (`extractAdvanceableWatermark` returns `undefined`) and the tick
   * is retried.
   *
   * NOT asserted: that the same SET of stages ran. Under `step_error`
   * the parallelized arrangement may report a stage that the serial
   * arrangement halts before reaching, or vice versa, because
   * concurrency changes which steps have started by the time a
   * sibling throws. Successful and clean-halt paths exercise
   * `assertSameStageSet` to lock that property in for those cases.
   *
   * NOT asserted: that per-stage `counts` for parallelized stages
   * match serial. Children of a parallel group compute counts against
   * pre-group state by design (see `runStage`). This artifact is
   * documented and verified narrowly in `assertWithinGroupCountsAreLocal`.
   */

  /** Mirror of `dispatcher.ts:extractAdvanceableWatermark`. */
  const advanceableWatermark = (result: DispatcherPipelineResult): string | undefined => {
    if (
      !result.completed &&
      result.haltReason !== 'no_episodes' &&
      result.haltReason !== 'no_actions'
    ) {
      return undefined;
    }
    return result.finalState.nextEventWatermark;
  };

  const assertObservableEquivalence = (
    serial: DispatcherPipelineResult,
    parallel: DispatcherPipelineResult
  ): void => {
    expect(parallel.completed).toBe(serial.completed);
    expect(parallel.haltReason).toBe(serial.haltReason);
    expect(advanceableWatermark(parallel)).toBe(advanceableWatermark(serial));

    const serialByName = new Map(serial.stageTimings.map((t) => [t.name, t] as const));
    const parallelByName = new Map(parallel.stageTimings.map((t) => [t.name, t] as const));
    for (const [name, serialTiming] of serialByName) {
      const parallelTiming = parallelByName.get(name);
      if (!parallelTiming) continue;
      expect(parallelTiming.halted).toBe(serialTiming.halted);
      expect(parallelTiming.error).toEqual(serialTiming.error);
    }
  };

  /**
   * For paths that do not halt early (full pipeline runs, controlled
   * `no_episodes`/`no_actions` halts at their normal positions), the
   * stage set is identical, `finalState` is deeply equal, and the LAST
   * stage's `counts` (= `tick_summary.totals`) agree because both
   * arrangements walk the same deterministic mocks to the same end.
   * Stricter checks beyond `assertObservableEquivalence`.
   */
  const assertFullEquivalence = (
    serial: DispatcherPipelineResult,
    parallel: DispatcherPipelineResult
  ): void => {
    expect(new Set(parallel.stageTimings.map((t) => t.name))).toEqual(
      new Set(serial.stageTimings.map((t) => t.name))
    );
    expect(parallel.finalState).toEqual(serial.finalState);

    const lastSerial = serial.stageTimings[serial.stageTimings.length - 1];
    const lastParallel = parallel.stageTimings[parallel.stageTimings.length - 1];
    expect(lastParallel?.counts).toEqual(lastSerial?.counts);
  };

  /**
   * Verify the parallel-group artifact is exactly what we documented:
   * the parallelized `fetch_policies` reports counts reflecting only its
   * own delta against the pre-group state, NOT the cumulative state at
   * its serial position. If a future change makes parallel counts
   * cumulative, this assertion fails loudly so we revisit equivalence.
   */
  const assertWithinGroupCountsAreLocal = (parallel: DispatcherPipelineResult): void => {
    const policiesTiming = parallel.stageTimings.find((t) => t.name === 'fetch_policies');
    if (!policiesTiming) return;
    expect(policiesTiming.counts.episodes).toBe(0);
    expect(policiesTiming.counts.suppressions).toBe(0);
    expect(policiesTiming.counts.rules).toBe(0);
  };

  const continueWith = (data?: Parameters<typeof Object>[0]): Promise<DispatcherStepOutput> =>
    Promise.resolve({ type: 'continue', ...(data ? { data } : {}) });

  const haltWith = (
    reason: 'no_episodes' | 'no_actions',
    data?: Parameters<typeof Object>[0]
  ): Promise<DispatcherStepOutput> =>
    Promise.resolve({ type: 'halt', reason, ...(data ? { data } : {}) });

  const buildBaseFixtures = (overrides?: Partial<StepFixtures>): StepFixtures => {
    const episodes = [
      createAlertEpisode({ episode_id: 'ep-1' }),
      createAlertEpisode({ episode_id: 'ep-2' }),
    ];
    const policy = createActionPolicy();
    const rule = createRule();

    return {
      fetchEpisodes: createMockDispatcherStep('fetch_episodes', () =>
        continueWith({ episodes, nextEventWatermark: '2026-01-22T07:31:00.000Z' })
      ),
      fetchSuppressions: createMockDispatcherStep('fetch_suppressions', () =>
        continueWith({ suppressions: [] })
      ),
      applySuppression: createMockDispatcherStep('apply_suppression', (state) =>
        continueWith({
          suppressed: [],
          dispatchable: state.episodes ?? [],
        })
      ),
      fetchRules: createMockDispatcherStep('fetch_rules', () =>
        continueWith({ rules: new Map<RuleId, ReturnType<typeof createRule>>([[rule.id, rule]]) })
      ),
      fetchPolicies: createMockDispatcherStep('fetch_policies', () =>
        continueWith({
          policies: new Map<ActionPolicyId, ReturnType<typeof createActionPolicy>>([
            [policy.id, policy],
          ]),
        })
      ),
      evaluateMatchers: createMockDispatcherStep('evaluate_matchers', (state) =>
        continueWith({
          matched: (state.dispatchable ?? []).map((episode) => ({ episode, policy })),
        })
      ),
      buildGroups: createMockDispatcherStep('build_groups', (state) =>
        continueWith({
          groups:
            state.matched && state.matched.length > 0
              ? [
                  {
                    id: 'g-1',
                    spaceId: policy.spaceId,
                    policyId: policy.id,
                    destinations: policy.destinations,
                    groupKey: {},
                    episodes: state.matched.map((m) => m.episode),
                  },
                ]
              : [],
        })
      ),
      applyThrottling: createMockDispatcherStep('apply_throttling', (state) =>
        continueWith({
          dispatch: state.groups ?? [],
          throttled: [],
        })
      ),
      dispatch: createMockDispatcherStep('dispatch', () => continueWith()),
      recordActions: createMockDispatcherStep('record_actions', () => continueWith()),
      ...overrides,
    };
  };

  const scenarios: Scenario[] = [
    {
      name: 'episodes match a policy and dispatch end-to-end',
      steps: () => buildBaseFixtures(),
      fullEquivalence: true,
    },
    {
      name: 'fetch_episodes halts no_episodes (with watermark advance)',
      steps: () =>
        buildBaseFixtures({
          fetchEpisodes: createMockDispatcherStep('fetch_episodes', () =>
            haltWith('no_episodes', { nextEventWatermark: '2026-01-22T07:31:00.000Z' })
          ),
        }),
      // Parallel arrangement still runs fetch_policies as the sibling
      // of the halting fetch_episodes; serial halts before reaching
      // fetch_policies. Stage set and intermediate state differ; the
      // advanceable watermark is identical.
      fullEquivalence: false,
    },
    {
      name: 'all episodes suppressed → record_actions writes only suppress entries',
      steps: () => {
        const episodes = [
          createAlertEpisode({ episode_id: 'ep-1' }),
          createAlertEpisode({ episode_id: 'ep-2' }),
        ];
        return buildBaseFixtures({
          fetchEpisodes: createMockDispatcherStep('fetch_episodes', () =>
            continueWith({ episodes, nextEventWatermark: '2026-01-22T07:31:00.000Z' })
          ),
          fetchSuppressions: createMockDispatcherStep('fetch_suppressions', () =>
            continueWith({
              suppressions: episodes.map((e) =>
                createAlertEpisodeSuppression({ episode_id: e.episode_id, should_suppress: true })
              ),
            })
          ),
          applySuppression: createMockDispatcherStep('apply_suppression', (state) =>
            continueWith({
              dispatchable: [],
              suppressed: (state.episodes ?? []).map((e) => ({ ...e, reason: 'snooze' })),
            })
          ),
        });
      },
      fullEquivalence: true,
    },
    {
      name: 'no enabled policies → unmatched path',
      steps: () =>
        buildBaseFixtures({
          fetchPolicies: createMockDispatcherStep('fetch_policies', () =>
            continueWith({ policies: new Map() })
          ),
          evaluateMatchers: createMockDispatcherStep('evaluate_matchers', () =>
            continueWith({ matched: [] })
          ),
          buildGroups: createMockDispatcherStep('build_groups', () => continueWith({ groups: [] })),
          applyThrottling: createMockDispatcherStep('apply_throttling', () =>
            continueWith({ dispatch: [], throttled: [] })
          ),
        }),
      fullEquivalence: true,
    },
    {
      name: 'record_actions halts no_actions',
      steps: () =>
        buildBaseFixtures({
          recordActions: createMockDispatcherStep('record_actions', () => haltWith('no_actions')),
        }),
      fullEquivalence: true,
    },
    {
      name: 'fetch_policies throws → step_error',
      steps: () =>
        buildBaseFixtures({
          fetchPolicies: createMockDispatcherStep('fetch_policies', () => {
            throw new Error('policies boom');
          }),
        }),
      // Serial reaches fetch_policies after fetch_suppressions/
      // apply_suppression/fetch_rules; parallel halts after the
      // fetch_policies sibling throws. Different stages run; same
      // step_error outcome and same advanceable watermark.
      fullEquivalence: false,
    },
    {
      name: 'fetch_episodes throws → step_error',
      steps: () =>
        buildBaseFixtures({
          fetchEpisodes: createMockDispatcherStep('fetch_episodes', () => {
            throw new Error('episodes boom');
          }),
        }),
      // Parallel arrangement still completes fetch_policies even though
      // fetch_episodes throws — they run concurrently. Serial halts
      // immediately. Same step_error outcome, same advanceable watermark.
      fullEquivalence: false,
    },
    {
      name: 'fetch_episodes AND fetch_policies both throw → step_error',
      steps: () =>
        buildBaseFixtures({
          fetchEpisodes: createMockDispatcherStep('fetch_episodes', () => {
            throw new Error('episodes boom');
          }),
          fetchPolicies: createMockDispatcherStep('fetch_policies', () => {
            throw new Error('policies boom');
          }),
        }),
      fullEquivalence: false,
    },
  ];

  it.each(scenarios)(
    'produces equivalent observable output: $name',
    async ({ steps, fullEquivalence }) => {
      const fixtures = steps();

      const serial = await runWithBindings(fixtures, 'serial');
      const parallel = await runWithBindings(fixtures, 'parallel');

      assertObservableEquivalence(serial, parallel);
      assertWithinGroupCountsAreLocal(parallel);
      if (fullEquivalence) {
        assertFullEquivalence(serial, parallel);
      }
    }
  );
});
