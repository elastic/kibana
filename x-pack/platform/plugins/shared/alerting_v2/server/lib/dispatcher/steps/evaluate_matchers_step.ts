/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectable } from 'inversify';
import { evaluateKql } from '@kbn/eval-kql';
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

@injectable()
export class EvaluateMatchersStep implements DispatcherStep {
  public readonly name = 'evaluate_matchers';

  public async execute(state: Readonly<DispatcherPipelineState>): Promise<DispatcherStepOutput> {
    const { dispatchable = [], rules = new Map(), policies = new Map() } = state;

    const matched = evaluateMatchers(dispatchable, rules, policies);

    return { type: 'continue', data: { matched } };
  }
}

export function evaluateMatchers(
  dispatchable: readonly AlertEpisode[],
  rules: ReadonlyMap<RuleId, Rule>,
  policies: ReadonlyMap<NotificationPolicyId, NotificationPolicy>
): MatchedPair[] {
  const matched: MatchedPair[] = [];
  const allPolicies = Array.from(policies.values());

  for (const episode of dispatchable) {
    const rule = rules.get(episode.rule_id);
    if (!rule) continue;

    for (const policy of allPolicies) {
      if (!matchesRuleLabels(policy, rule)) continue;

      if (!policy.enabled) continue;
      if (policy.snoozedUntil && new Date(policy.snoozedUntil) > new Date()) continue;

      if (!policy.matcher) {
        matched.push({ episode, policy });
        continue;
      }

      const isMatch = evaluateKql(policy.matcher, episode);
      if (isMatch) {
        matched.push({ episode, policy });
      }
    }
  }

  return matched;
}

function matchesRuleLabels(policy: NotificationPolicy, rule: Rule): boolean {
  if (policy.ruleLabels.length === 0) return true;
  return policy.ruleLabels.some((label) => rule.labels.includes(label));
}
