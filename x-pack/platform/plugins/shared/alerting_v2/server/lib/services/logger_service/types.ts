/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleKind } from '@kbn/alerting-v2-schemas';
import type { LogMessageSource } from '@kbn/logging';
import type { AlertingV2LogCode } from '../../errors/error_codes';
import type { ErrorSource } from '../../errors/error_source';

/**
 * Closed vocabulary of the entity identifiers an operator filters on. Values
 * are keyword-indexed, so they must stay low-cardinality identifiers — never
 * names, user input, counts, or durations.
 */
export type AlertingLabels = Partial<{
  rule_id: string;
  rule_kind: RuleKind;
  rule_template_id: string;
  space_id: string;
  policy_id: string;
  group_id: string;
  group_hash: string;
  alert_id: string;
  workflow_id: string;
  execution_id: string;
  task_id: string;
  skill_id: string;
  attachment_type: string;
  event_type: string;
  step: string;
  /**
   * Who a failure is attributed to (`user` or `framework`), as Task Manager counts
   * it. Set on `RULE_EXECUTION_STEP_FAILED`.
   */
  error_source: ErrorSource;
  subsystem: string;
  /**
   * Which member of a fixed, statically declared set failed - e.g. a saved object
   * type, a datastream, an ES|QL view. Enum-like rather than an entity id.
   */
  resource: string;
}>;

/**
 * Subsystems that own a child logger. A name maps to the ECS `log.logger`
 * value `plugins.alertingVTwo.<name>`, which is the primary axis an operator
 * filters on.
 */
export type AlertingSubsystemName =
  | 'routes'
  | 'rulesClient'
  | 'ruleTemplateClient'
  | 'actionPolicyClient'
  | 'ruleExecutor'
  | 'director'
  | 'dispatcher'
  | 'executionHistory'
  | 'resources'
  | 'tasks'
  | 'savedObjects'
  | 'agentBuilder'
  | 'events'
  | 'telemetry';

export interface DebugParams {
  message: LogMessageSource;
  labels?: AlertingLabels;
}

export interface InfoParams {
  message: LogMessageSource;
  labels?: AlertingLabels;
}

export interface WarnParams {
  message: LogMessageSource;
  error?: unknown;
  code: AlertingV2LogCode;
  labels?: AlertingLabels;
}

export interface ErrorParams {
  message?: LogMessageSource;
  error: unknown;
  code: AlertingV2LogCode;
  labels?: AlertingLabels;
}
