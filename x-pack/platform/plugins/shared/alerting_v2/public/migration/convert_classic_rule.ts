/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DASHBOARD_ARTIFACT_TYPE,
  DEFAULT_TIME_FIELD,
  RUNBOOK_ARTIFACT_TYPE,
} from '@kbn/alerting-v2-constants';
import type { CreateRuleData } from '@kbn/alerting-v2-schemas';
import { resolveArtifactId } from '@kbn/alerting-v2-utils';
import { getNonEmptyString } from './converters/utils';
import {
  convertClassicActions,
  getMigrationRoutingTag,
} from './converters/action_policy_converter';
import type { ClassicRule, ConvertRuleParams, RuleMigration, RuleTypeMigration } from './types';

const getArtifacts = ({ artifacts }: ClassicRule): CreateRuleData['artifacts'] => {
  if (!artifacts) return undefined;

  const runbook = getNonEmptyString(artifacts.investigation_guide?.blob);
  const converted: NonNullable<CreateRuleData['artifacts']> = [
    ...(runbook
      ? [
          {
            id: resolveArtifactId(RUNBOOK_ARTIFACT_TYPE),
            type: RUNBOOK_ARTIFACT_TYPE,
            data: { content: runbook },
          },
        ]
      : []),
    ...(artifacts.dashboards ?? []).map(({ id }) => ({
      id: resolveArtifactId(DASHBOARD_ARTIFACT_TYPE),
      type: DASHBOARD_ARTIFACT_TYPE,
      data: { dashboard_id: id },
    })),
  ];

  return converted.length ? converted : undefined;
};

/**
 * Converts a classic rule into a v2 alert rule plus simple action policies. Rule-level fields
 * (name, schedule, alert delay, artifacts, actions) are mapped here; the rule type's migration
 * maps its params and supplies default action messages.
 */
export const convertClassicRule = (
  rule: ClassicRule,
  { convertParams, defaultActionPolicy }: RuleTypeMigration
): RuleMigration => {
  const routingTag = getMigrationRoutingTag(rule.id);
  const { actionPolicies, skippedActions } = convertClassicActions({
    actions: rule.actions ?? [],
    ruleName: rule.name,
    routingTag,
    defaultActionPolicy,
  });

  return {
    rule: convertRule(rule, convertParams, actionPolicies.length ? [routingTag] : []),
    actionPolicies,
    skippedActions,
  };
};

function convertRule(
  rule: ClassicRule,
  convertParams: ConvertRuleParams,
  routingTags: string[]
): CreateRuleData {
  const { lookback, time_field: timeField, ...converted } = convertParams(rule.params);
  const artifacts = getArtifacts(rule);

  return {
    kind: 'alert',
    metadata: {
      name: rule.name,
      ...(rule.tags.length ? { tags: rule.tags } : {}),
      ...(routingTags.length ? { routing_tags: routingTags } : {}),
    },
    time_field: timeField ?? DEFAULT_TIME_FIELD,
    schedule: {
      every: rule.schedule.interval,
      ...(lookback ? { lookback } : {}),
    },
    recovery: { strategy: 'no_breach' },
    no_data: { strategy: 'ignore' },
    state_transition: {
      pending: { count: Math.max((rule.alertDelay?.active ?? 1) - 1, 0) },
      recovering: { count: 0 },
    },
    ...converted,
    ...(artifacts ? { artifacts } : {}),
  };
}
