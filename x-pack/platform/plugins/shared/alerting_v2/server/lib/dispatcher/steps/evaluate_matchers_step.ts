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
import { AlertTriage, PolicyCatalog, PolicyMatcher, RuleCatalog } from '../state';
import type {
  Alert,
  DispatcherPipelineState,
  DispatcherStep,
  DispatcherStepOutput,
  MatchedPair,
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
      triage = AlertTriage.empty(),
      rules = RuleCatalog.empty(),
      policies = PolicyCatalog.empty(),
    } = state;

    const matched = this.evaluateMatchers(triage.dispatchable, rules, policies, logger);

    return { type: 'continue', data: { matched } };
  }

  private evaluateMatchers(
    dispatchable: readonly Alert[],
    rules: RuleCatalog,
    policies: PolicyCatalog,
    logger: LoggerServiceContract
  ): MatchedPair[] {
    const matched: MatchedPair[] = [];
    const now = Date.now();

    for (const alert of dispatchable) {
      if (rules.isOrphanedInternalAlert(alert)) continue;
      const rule = rules.forAlert(alert);

      const spacePolicies = policies.inSpace(alert.space_id);
      let context: MatcherContext | undefined;

      for (const policy of spacePolicies) {
        if (!policy.enabled) continue;
        if (policy.snoozedUntil && new Date(policy.snoozedUntil).getTime() > now) continue;

        const policyMatcher = PolicyMatcher.of(policy.matcher);
        if (policyMatcher.isCatchAll()) {
          matched.push({ alert, policy });
          continue;
        }

        if (!policyMatcher.matchesTags(rule?.tags)) continue;

        const expression = policyMatcher.expressionKql();
        if (expression === null) {
          matched.push({ alert, policy });
          continue;
        }

        context ??= createMatcherContext(alert);
        let isMatch = false;
        try {
          isMatch = evaluateKql(expression, context);
        } catch {
          logger.warn({
            message: 'Policy matcher failed to evaluate; treating as no-match',
            code: ALERTING_LOG_CODES.POLICY_MATCHER_KQL_INVALID,
            labels: {
              policy_id: policy.id,
              alert_id: alert.alert_id,
              rule_id: alert.rule_id ?? undefined,
              space_id: alert.space_id,
            },
          });
          continue;
        }

        if (isMatch) {
          matched.push({ alert, policy });
        }
      }
    }

    return matched;
  }
}
