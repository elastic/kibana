/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ApplyDependencySuppressionStep,
  RULE_DEPENDENCY_REASON_PREFIX,
} from './apply_dependency_suppression_step';
import { createQueryService } from '../../services/query_service/query_service.mock';
import { createActiveParentRulesResponse } from '../fixtures/dispatcher';
import {
  createAlertEpisode,
  createActionPolicy,
  createDispatcherPipelineState,
  createMatchedPair,
  createRule,
} from '../fixtures/test_utils';

describe('ApplyDependencySuppressionStep', () => {
  const build = () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new ApplyDependencySuppressionStep(queryService);
    return { step, mockEsClient };
  };

  it('returns continue with no data when there are no matched pairs', async () => {
    const { step, mockEsClient } = build();

    const result = await step.execute(createDispatcherPipelineState({ matched: [] }));

    expect(result).toEqual({ type: 'continue' });
    expect(mockEsClient.esql.query).not.toHaveBeenCalled();
  });

  it('returns continue with no data when no matched policy has suppressDependentRules enabled', async () => {
    const { step, mockEsClient } = build();

    const episode = createAlertEpisode({ rule_id: 'child' });
    const pair = createMatchedPair({
      episode,
      policy: createActionPolicy({ suppressDependentRules: false }),
    });
    const state = createDispatcherPipelineState({
      matched: [pair],
      rules: new Map([['child', createRule({ id: 'child', dependsOn: ['parent'] })]]),
    });

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'continue' });
    expect(mockEsClient.esql.query).not.toHaveBeenCalled();
  });

  it('returns continue with no data when the rule has no dependencies', async () => {
    const { step, mockEsClient } = build();

    const episode = createAlertEpisode({ rule_id: 'child' });
    const pair = createMatchedPair({
      episode,
      policy: createActionPolicy({ suppressDependentRules: true }),
    });
    const state = createDispatcherPipelineState({
      matched: [pair],
      rules: new Map([['child', createRule({ id: 'child', dependsOn: [] })]]),
    });

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'continue' });
    expect(mockEsClient.esql.query).not.toHaveBeenCalled();
  });

  it('suppresses the pair when the parent has an active episode', async () => {
    const { step, mockEsClient } = build();
    mockEsClient.esql.query.mockResolvedValue(
      createActiveParentRulesResponse([{ rule_id: 'parent' }])
    );

    const episode = createAlertEpisode({ rule_id: 'child', group_hash: 'g1', episode_id: 'e1' });
    const pair = createMatchedPair({
      episode,
      policy: createActionPolicy({ id: 'p1', suppressDependentRules: true }),
    });
    const state = createDispatcherPipelineState({
      matched: [pair],
      rules: new Map([['child', createRule({ id: 'child', dependsOn: ['parent'] })]]),
    });

    const result = await step.execute(state);

    if (result.type !== 'continue') throw new Error('expected continue');
    expect(result.data?.matched).toEqual([]);
    expect(result.data?.suppressed).toHaveLength(1);
    expect(result.data?.suppressed?.[0]).toEqual(
      expect.objectContaining({
        rule_id: 'child',
        group_hash: 'g1',
        episode_id: 'e1',
        reason: `${RULE_DEPENDENCY_REASON_PREFIX}:parent`,
        // `policyId` attributes the outcome to the matching policy for execution history.
        policyId: 'p1',
      })
    );
  });

  it.each(['pending', 'recovering', 'inactive'] as const)(
    'does not suppress when the parent episode status is %s (not active)',
    async (parentStatus) => {
      const { step, mockEsClient } = build();
      // getRulesWithActiveEpisodesQuery only ever returns rule ids whose latest
      // status is "active" — a non-active parent yields an empty result set.
      mockEsClient.esql.query.mockResolvedValue(createActiveParentRulesResponse([]));

      const episode = createAlertEpisode({ rule_id: 'child' });
      const pair = createMatchedPair({
        episode,
        policy: createActionPolicy({ suppressDependentRules: true }),
      });
      const state = createDispatcherPipelineState({
        matched: [pair],
        rules: new Map([['child', createRule({ id: 'child', dependsOn: ['parent'] })]]),
      });

      const result = await step.execute(state);

      expect(result).toEqual({ type: 'continue' });
      void parentStatus;
    }
  );

  it('passes through a pair whose policy does not have suppressDependentRules enabled, even when a sibling pair for the same episode is suppressed', async () => {
    const { step, mockEsClient } = build();
    mockEsClient.esql.query.mockResolvedValue(
      createActiveParentRulesResponse([{ rule_id: 'parent' }])
    );

    const episode = createAlertEpisode({ rule_id: 'child', group_hash: 'g1', episode_id: 'e1' });
    const suppressedPair = createMatchedPair({
      episode,
      policy: createActionPolicy({ id: 'p1', suppressDependentRules: true }),
    });
    const passthroughPair = createMatchedPair({
      episode,
      policy: createActionPolicy({ id: 'p2', suppressDependentRules: false }),
    });
    const state = createDispatcherPipelineState({
      matched: [suppressedPair, passthroughPair],
      rules: new Map([['child', createRule({ id: 'child', dependsOn: ['parent'] })]]),
    });

    const result = await step.execute(state);

    if (result.type !== 'continue') throw new Error('expected continue');
    expect(result.data?.matched).toEqual([passthroughPair]);
    // Only the flagged pair is suppressed; the non-flagged sibling passes through.
    expect(result.data?.suppressed).toHaveLength(1);
    expect(result.data?.suppressed?.[0]).toEqual(expect.objectContaining({ policyId: 'p1' }));
  });

  it('does not dedup by episode: two policies suppressing the same episode each produce their own suppressed entry', async () => {
    // Mirrors how `throttled` is recorded per-policy, so an episode suppressed
    // by two different policies gets one `suppress` outcome per policy rather
    // than being collapsed into a single entry.
    const { step, mockEsClient } = build();
    mockEsClient.esql.query.mockResolvedValue(
      createActiveParentRulesResponse([{ rule_id: 'parent' }])
    );

    const episode = createAlertEpisode({ rule_id: 'child', group_hash: 'g1', episode_id: 'e1' });
    const pairA = createMatchedPair({
      episode,
      policy: createActionPolicy({ id: 'p1', suppressDependentRules: true }),
    });
    const pairB = createMatchedPair({
      episode,
      policy: createActionPolicy({ id: 'p2', suppressDependentRules: true }),
    });
    const state = createDispatcherPipelineState({
      matched: [pairA, pairB],
      rules: new Map([['child', createRule({ id: 'child', dependsOn: ['parent'] })]]),
    });

    const result = await step.execute(state);

    if (result.type !== 'continue') throw new Error('expected continue');
    expect(result.data?.matched).toEqual([]);
    expect(result.data?.suppressed).toHaveLength(2);
    expect(new Set(result.data?.suppressed?.map((s) => s.policyId))).toEqual(new Set(['p1', 'p2']));
  });

  it('suppresses when any of multiple parents is active (ANY semantics)', async () => {
    const { step, mockEsClient } = build();
    mockEsClient.esql.query.mockResolvedValue(
      createActiveParentRulesResponse([{ rule_id: 'parent-b' }])
    );

    const episode = createAlertEpisode({ rule_id: 'child' });
    const pair = createMatchedPair({
      episode,
      policy: createActionPolicy({ suppressDependentRules: true }),
    });
    const state = createDispatcherPipelineState({
      matched: [pair],
      rules: new Map([['child', createRule({ id: 'child', dependsOn: ['parent-a', 'parent-b'] })]]),
    });

    const result = await step.execute(state);

    if (result.type !== 'continue') throw new Error('expected continue');
    expect(result.data?.suppressed?.[0]).toEqual(
      expect.objectContaining({ reason: `${RULE_DEPENDENCY_REASON_PREFIX}:parent-b` })
    );
  });

  it('cascades transitively: suppressing B does not require C to know about A', async () => {
    // Chain A -> B -> C. C only ever declares dependsOn: ['B']; the step is
    // never given A's id at all. B's episode itself is untouched (only its
    // notification pair is dropped), so a later tick that evaluates C against
    // B's still-"active" episode continues to suppress C independently.
    const { step, mockEsClient } = build();
    mockEsClient.esql.query.mockResolvedValue(createActiveParentRulesResponse([{ rule_id: 'B' }]));

    const episodeC = createAlertEpisode({ rule_id: 'C', group_hash: 'gc', episode_id: 'ec' });
    const pairC = createMatchedPair({
      episode: episodeC,
      policy: createActionPolicy({ suppressDependentRules: true }),
    });
    const state = createDispatcherPipelineState({
      matched: [pairC],
      rules: new Map([['C', createRule({ id: 'C', dependsOn: ['B'] })]]),
    });

    const result = await step.execute(state);

    if (result.type !== 'continue') throw new Error('expected continue');
    expect(result.data?.matched).toEqual([]);
    expect(result.data?.suppressed?.[0]).toEqual(
      expect.objectContaining({ rule_id: 'C', reason: `${RULE_DEPENDENCY_REASON_PREFIX}:B` })
    );
  });

  it('appends to an existing suppressed array rather than overwriting it', async () => {
    const { step, mockEsClient } = build();
    mockEsClient.esql.query.mockResolvedValue(
      createActiveParentRulesResponse([{ rule_id: 'parent' }])
    );

    const previouslySuppressed = {
      ...createAlertEpisode({ rule_id: 'other', episode_id: 'previously-suppressed' }),
      reason: 'maintenance_window:mw-1',
    };
    const episode = createAlertEpisode({ rule_id: 'child' });
    const pair = createMatchedPair({
      episode,
      policy: createActionPolicy({ suppressDependentRules: true }),
    });
    const state = createDispatcherPipelineState({
      matched: [pair],
      rules: new Map([['child', createRule({ id: 'child', dependsOn: ['parent'] })]]),
      suppressed: [previouslySuppressed],
    });

    const result = await step.execute(state);

    if (result.type !== 'continue') throw new Error('expected continue');
    expect(result.data?.suppressed).toHaveLength(2);
    expect(result.data?.suppressed?.[0]).toEqual(previouslySuppressed);
  });

  it('does not query when the rule is missing from the rules map', async () => {
    const { step, mockEsClient } = build();

    const episode = createAlertEpisode({ rule_id: 'child' });
    const pair = createMatchedPair({
      episode,
      policy: createActionPolicy({ suppressDependentRules: true }),
    });
    const state = createDispatcherPipelineState({
      matched: [pair],
      rules: new Map(),
    });

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'continue' });
    expect(mockEsClient.esql.query).not.toHaveBeenCalled();
  });
});
