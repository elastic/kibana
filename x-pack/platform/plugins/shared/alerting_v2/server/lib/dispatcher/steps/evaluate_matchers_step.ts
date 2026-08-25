/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MatcherContext } from '@kbn/alerting-v2-schemas';
import { evaluateKql } from '@kbn/eval-kql';
import { injectable } from 'inversify';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import type { LoggerServiceContract } from '../../services/logger_service/logger_service';
import type {
  ActionPolicy,
  ActionPolicyId,
  AlertEpisode,
  DispatcherPipelineState,
  DispatcherStep,
  DispatcherStepOutput,
  MatchedPair,
  Rule,
  RuleId,
} from '../types';
import { createMatcherContext } from './utils/matcher_context';

@injectable()
export class EvaluateMatchersStep implements DispatcherStep {
  public readonly name = 'evaluate_matchers';

  public async execute(
    state: Readonly<DispatcherPipelineState>,
    logger: LoggerServiceContract
  ): Promise<DispatcherStepOutput> {
    const {
      dispatchable = [],
      rules = new Map<RuleId, Rule>(),
      policies = new Map<ActionPolicyId, ActionPolicy>(),
    } = state;

    const matched = this.evaluateMatchers(dispatchable, rules, policies, logger);

    return { type: 'continue', data: { matched } };
  }

  private evaluateMatchers(
    dispatchable: readonly AlertEpisode[],
    rules: ReadonlyMap<RuleId, Rule>,
    policies: ReadonlyMap<ActionPolicyId, ActionPolicy>,
    logger: LoggerServiceContract
  ): MatchedPair[] {
    const matched: MatchedPair[] = [];

    const policiesBySpace = Map.groupBy(policies.values(), (policy) => policy.spaceId);

    for (const episode of dispatchable) {
      const rule = episode.rule_id ? rules.get(episode.rule_id) : undefined;
      // Internal episodes whose rule is absent (deleted or failed to fetch) are skipped
      // to prevent catch-all policies from dispatching spurious notifications.
      if (episode.rule_id != null && rule == null) continue;

      const spacePolicies = policiesBySpace.get(episode.space_id) ?? [];
      let context: MatcherContext | undefined;

      for (const policy of spacePolicies) {
        if (!policy.enabled) continue;
        if (policy.snoozedUntil && new Date(policy.snoozedUntil) > new Date()) continue;

        if (!policy.matcher) {
          matched.push({ episode, policy });
          continue;
        }

        context ??= createMatcherContext(episode, rule);
        let isMatch = false;
        try {
          isMatch = evaluateKql(policy.matcher, context);
        } catch {
          logger.warn({
            message: 'Policy matcher failed to evaluate; treating as no-match',
            code: ALERTING_LOG_CODES.POLICY_MATCHER_KQL_INVALID,
            labels: {
              policy_id: policy.id,
              episode_id: episode.episode_id,
              rule_id: episode.rule_id ?? undefined,
              space_id: episode.space_id,
            },
          });
          continue;
        }

        if (isMatch) {
          matched.push({ episode, policy });
        }
      }
    }

    return matched;
  }
}
