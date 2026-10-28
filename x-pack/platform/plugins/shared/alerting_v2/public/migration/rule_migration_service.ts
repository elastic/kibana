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
import { esQueryRuleConverter } from './converters/es_query_rule_converter';
import { getNonEmptyString } from './converters/utils';
import {
  convertClassicActions,
  getMigrationRoutingTag,
} from './converters/action_policy_converter';
import type { ClassicRule, RuleConverter, RuleMigration } from './types';

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
 * Converts classic rules into v2 alert rules. Rule-level fields (name, schedule, alert
 * delay, artifacts) are mapped here; each registered converter maps its rule type's params.
 */
export class RuleMigrationService {
  private readonly converters = new Map<string, RuleConverter>();

  public register(converter: RuleConverter): void {
    if (this.converters.has(converter.ruleTypeId)) {
      throw new Error(`A rule converter is already registered for "${converter.ruleTypeId}"`);
    }
    this.converters.set(converter.ruleTypeId, converter);
  }

  public canMigrate(ruleTypeId: string): boolean {
    return this.converters.has(ruleTypeId);
  }

  /** Returns `undefined` when no converter is registered for the rule's type. */
  public migrate(rule: ClassicRule): RuleMigration | undefined {
    const converter = this.converters.get(rule.ruleTypeId);
    if (!converter) return undefined;

    const routingTag = getMigrationRoutingTag(rule.id);
    const { actionPolicies, skippedActions } = convertClassicActions({
      actions: rule.actions ?? [],
      ruleName: rule.name,
      routingTag,
    });

    return {
      rule: convertRule(rule, converter, actionPolicies.length ? [routingTag] : []),
      actionPolicies,
      skippedActions,
    };
  }
}

const convertRule = (
  rule: ClassicRule,
  converter: RuleConverter,
  routingTags: string[]
): CreateRuleData => {
  const { lookback, time_field: timeField, ...converted } = converter.convertParams(rule.params);
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
};

export const createRuleMigrationService = (): RuleMigrationService => {
  const service = new RuleMigrationService();
  service.register(esQueryRuleConverter);
  return service;
};
