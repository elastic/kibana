/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InlineActionStepType } from '@kbn/alerting-v2-utils';
import type { CreateActionPolicyData, CreateRuleData } from '@kbn/alerting-v2-schemas';

/** A classic rule action, in the camelCase shape of the classic rules client. */
export interface ClassicRuleAction {
  uuid?: string;
  id: string;
  actionTypeId: string;
  group?: string;
  params: Record<string, unknown>;
  frequency?: {
    summary: boolean;
    notifyWhen: string;
    throttle: string | null;
  };
  alertsFilter?: unknown;
}

/** The subset of a classic (v1) rule needed to build a v2 rule. */
export interface ClassicRule {
  id: string;
  ruleTypeId: string;
  name: string;
  tags: string[];
  schedule: { interval: string };
  params: Record<string, unknown>;
  alertDelay?: { active: number } | null;
  actions?: ClassicRuleAction[];
  artifacts?: {
    dashboards?: Array<{ id: string }>;
    investigation_guide?: { blob: string };
  } | null;
}

/** The rule-type-specific part of a conversion, derived from the classic rule's params. */
export type RuleParamsConversion = Pick<CreateRuleData, 'query'> &
  Partial<Pick<CreateRuleData, 'time_field' | 'grouping' | 'recovery' | 'no_data'>> & {
    lookback?: string;
  };

/** Converts the params of one classic rule type into v2 rule fields. */
export type ConvertRuleParams = (params: Record<string, unknown>) => RuleParamsConversion;

/**
 * Liquid templates over the action policy workflow payload (`inputs.payload`), used for
 * migrated actions whose classic mustache templates cannot be converted.
 */
export interface DefaultActionPolicy {
  /** Email subject. */
  subject: string;
  /** Email message and Slack text. */
  message: string;
}

/**
 * Registered by a classic rule type's owner to make its rules migratable. Rule-level fields
 * (name, tags, schedule, alert delay, artifacts, actions) are converted by alerting v2.
 */
export interface RuleMigrationDefinition {
  ruleTypeId: string;
  convertParams: ConvertRuleParams;
  /** The rule type's v2 counterpart of its classic default action message. */
  defaultActionPolicy?: DefaultActionPolicy;
}

export type ActionMigrationNote =
  /** Classic mustache templates cannot run in workflows, so a default message is used. */
  | 'templates_replaced'
  /** The classic connector cannot back a workflow step; a compatible connector must be picked. */
  | 'connector_required'
  /** Classic alert filters have no simple action policy equivalent and were dropped. */
  | 'alerts_filter_dropped';

/** A classic action converted to a simple (single-step workflow) action policy. */
export interface MigratedActionPolicy {
  sourceActionId: string;
  sourceConnectorId: string;
  sourceConnectorTypeId: string;
  stepType: InlineActionStepType;
  /** `null` when the classic connector cannot be reused by the workflow step. */
  connectorId: string | null;
  /** The workflow step params as YAML, in the shape the inline action editor reads. */
  params: string;
  policy: Omit<CreateActionPolicyData, 'destinations'>;
  notes: ActionMigrationNote[];
}

export type SkippedActionReason = 'unsupported_connector' | 'recovery_group';

export interface SkippedClassicAction {
  sourceActionId: string;
  sourceConnectorTypeId: string;
  reason: SkippedActionReason;
}

/** A classic rule converted to a v2 rule plus the action policies that notify for it. */
export interface RuleMigration {
  rule: CreateRuleData;
  actionPolicies: MigratedActionPolicy[];
  skippedActions: SkippedClassicAction[];
}

/** What a migration created, and the converted actions it could not create. */
export interface RuleMigrationResult {
  ruleId: string;
  actionPolicyIds: string[];
  /** Converted actions that need input first, such as a Slack v2 connector. */
  pendingActionPolicies: MigratedActionPolicy[];
  skippedActions: SkippedClassicAction[];
}
