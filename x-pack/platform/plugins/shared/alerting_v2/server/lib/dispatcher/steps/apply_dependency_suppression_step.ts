/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { QueryServiceContract } from '../../services/query_service/query_service';
import { QueryServiceInternalToken } from '../../services/query_service/tokens';
import { getRulesWithActiveEpisodesQuery, type ActiveParentRule } from '../queries';
import type {
  AlertEpisode,
  DispatcherPipelineState,
  DispatcherStep,
  DispatcherStepOutput,
  MatchedPair,
  RuleId,
} from '../types';

type SuppressedEntry = AlertEpisode & { reason: string; policyId?: string };

export const RULE_DEPENDENCY_REASON_PREFIX = 'rule_dependency';
const ruleDependencyReason = (parentRuleId: RuleId) =>
  `${RULE_DEPENDENCY_REASON_PREFIX}:${parentRuleId}`;

/**
 * Suppresses episodes whose rule `depends_on` a parent rule that currently
 * has an active episode, when the matched policy has `suppressDependentRules`
 * enabled (rna-program#753, "Type 1": any active parent episode suppresses
 * all matching child notifications — no group correlation).
 *
 * Suppression is per (episode, policy) pair: an episode still dispatches via
 * any other matching policy that doesn't have `suppressDependentRules` enabled,
 * and if *multiple* matching policies suppress the same episode, each produces
 * its own `suppressed` entry (mirroring how throttling is recorded per-policy)
 * rather than being deduped into one. The child's own episode lifecycle is
 * untouched — only notification delivery is suppressed — so chains (A -> B ->
 * C) cascade without recursion: each rule only ever checks its direct parents.
 */
@injectable()
export class ApplyDependencySuppressionStep implements DispatcherStep {
  public readonly name = 'apply_dependency_suppression';

  constructor(
    @inject(QueryServiceInternalToken) private readonly queryService: QueryServiceContract
  ) {}

  public async execute(state: Readonly<DispatcherPipelineState>): Promise<DispatcherStepOutput> {
    const { matched = [], rules = new Map(), suppressed = [] } = state;

    const flaggedPairs = matched.filter((pair) => pair.policy.suppressDependentRules === true);
    if (flaggedPairs.length === 0) {
      return { type: 'continue' };
    }

    const parentRuleIds = new Set<RuleId>();
    for (const { episode } of flaggedPairs) {
      const dependsOn = rules.get(episode.rule_id)?.dependsOn ?? [];
      for (const parentId of dependsOn) {
        parentRuleIds.add(parentId);
      }
    }

    if (parentRuleIds.size === 0) {
      return { type: 'continue' };
    }

    const activeParentIds = await this.fetchActiveParentRuleIds([...parentRuleIds]);
    if (activeParentIds.size === 0) {
      return { type: 'continue' };
    }

    const newMatched: MatchedPair[] = [];
    // One entry per (episode, policy) pair — not deduped by episode. If two
    // policies both suppress the same episode, both produce a `suppress`
    // outcome, consistent with how `throttled` is recorded per-policy.
    const newlySuppressed: SuppressedEntry[] = [];

    for (const pair of matched) {
      const { episode, policy } = pair;
      const dependsOn = rules.get(episode.rule_id)?.dependsOn ?? [];
      const activeParent =
        policy.suppressDependentRules === true
          ? dependsOn.find((parentId: RuleId) => activeParentIds.has(parentId))
          : undefined;

      if (!activeParent) {
        newMatched.push(pair);
        continue;
      }

      newlySuppressed.push({
        ...episode,
        reason: ruleDependencyReason(activeParent),
        policyId: policy.id,
      });
    }

    if (newlySuppressed.length === 0) {
      return { type: 'continue' };
    }

    return {
      type: 'continue',
      data: {
        matched: newMatched,
        suppressed: [...suppressed, ...newlySuppressed],
      },
    };
  }

  private async fetchActiveParentRuleIds(parentRuleIds: RuleId[]): Promise<Set<RuleId>> {
    const queries = getRulesWithActiveEpisodesQuery(parentRuleIds);
    const responses = await Promise.all(
      queries.map((request) =>
        this.queryService.executeQueryRows<ActiveParentRule>({ query: request.query })
      )
    );

    return new Set(responses.flat().map((row) => row.rule_id));
  }
}
