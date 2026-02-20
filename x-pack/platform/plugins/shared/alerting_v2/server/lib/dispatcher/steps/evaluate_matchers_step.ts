/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AlertEpisode,
  MatchedPair,
  NotificationPolicy,
  NotificationPolicyId,
  Rule,
  RuleId,
  DispatcherStep,
  DispatcherPipelineState,
  DispatcherStepOutput,
} from '../types';

export class EvaluateMatchersStep implements DispatcherStep {
  public readonly name = 'evaluate_matchers';

  public async execute(state: Readonly<DispatcherPipelineState>): Promise<DispatcherStepOutput> {
    const { active = [], rules = new Map(), policies = new Map() } = state;

    const matched = evaluateMatchers(active, rules, policies);

    return { type: 'continue', data: { matched } };
  }
}

export function evaluateMatchers(
  activeEpisodes: readonly AlertEpisode[],
  rules: ReadonlyMap<RuleId, Rule>,
  policies: ReadonlyMap<NotificationPolicyId, NotificationPolicy>
): MatchedPair[] {
  const matched: MatchedPair[] = [];

  for (const episode of activeEpisodes) {
    const rule = rules.get(episode.rule_id);
    if (!rule) continue;

    for (const policyId of rule.notificationPolicyIds) {
      const policy = policies.get(policyId);
      if (!policy) continue;

      if (!policy.matcher) {
        matched.push({ episode, policy });
        continue;
      }

      // TODO: Handle matcher evaluation here
    }
  }

  return matched;
}
