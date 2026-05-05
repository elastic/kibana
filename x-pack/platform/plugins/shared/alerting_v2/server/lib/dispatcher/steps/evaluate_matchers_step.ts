/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MatcherContext } from '@kbn/alerting-v2-schemas';
import { evaluateKql } from '@kbn/eval-kql';
import { inject, injectable } from 'inversify';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import type {
  AlertEpisode,
  DispatcherPipelineState,
  DispatcherStep,
  DispatcherStepOutput,
  MatchedPair,
  ActionPolicy,
  ActionPolicyId,
  Rule,
  RuleId,
} from '../types';

@injectable()
export class EvaluateMatchersStep implements DispatcherStep {
  public readonly name = 'evaluate_matchers';

  constructor(@inject(LoggerServiceToken) private readonly logger: LoggerServiceContract) {}

  public async execute(state: Readonly<DispatcherPipelineState>): Promise<DispatcherStepOutput> {
    const { dispatchable = [], rules = new Map(), policies = new Map() } = state;

    const matched = this.evaluateMatchers(dispatchable, rules, policies);

    return { type: 'continue', data: { matched } };
  }

  private evaluateMatchers(
    dispatchable: readonly AlertEpisode[],
    rules: ReadonlyMap<RuleId, Rule>,
    policies: ReadonlyMap<ActionPolicyId, ActionPolicy>
  ): MatchedPair[] {
    const matched: MatchedPair[] = [];

    const policiesBySpace = Map.groupBy(policies.values(), (policy) => policy.spaceId);

    for (const episode of dispatchable) {
      const rule = rules.get(episode.rule_id);
      if (!rule) continue;

      const spacePolicies = policiesBySpace.get(rule.spaceId) ?? [];
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
        } catch (err) {
          const rawReason = err instanceof Error ? err.message : String(err);
          const reason = truncate(rawReason, MAX_LOGGED_TEXT_LENGTH);
          const truncatedMatcher = truncate(policy.matcher, MAX_LOGGED_TEXT_LENGTH);
          this.logger.warn({
            message: () =>
              `Failed to evaluate KQL matcher for policy ${policy.id} (rule ${rule.id}, episode ${episode.episode_id}): ${reason}. Matcher: ${truncatedMatcher}. Treating as no-match.`,
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

const MAX_LOGGED_TEXT_LENGTH = 500;

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function createMatcherContext(episode: AlertEpisode, rule: Rule): MatcherContext {
  return {
    last_event_timestamp: episode.last_event_timestamp,
    group_hash: episode.group_hash,
    episode_id: episode.episode_id,
    episode_status: episode.episode_status,
    ...(episode.data ? { data: episode.data } : {}),
    rule: {
      id: rule.id,
      name: rule.name,
      description: rule.description,
      tags: rule.tags,
      enabled: rule.enabled,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    },
  };
}
