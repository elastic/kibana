/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogMessageSource } from '@kbn/logging';
import type { AlertingV2LogCode } from '../../errors/error_codes';

/**
 * Closed vocabulary of the entity identifiers an operator filters on. Values
 * are keyword-indexed, so they must stay low-cardinality identifiers — never
 * names, user input, counts, or durations.
 */
export type AlertingLabels = Partial<{
  rule_id: string;
  rule_kind: 'alert' | 'signal';
  space_id: string;
  policy_id: string;
  group_id: string;
  episode_id: string;
  workflow_id: string;
  execution_id: string;
  task_id: string;
  event_type: string;
  step: string;
  subsystem: string;
}>;

/**
 * Subsystems that own a child logger. A name maps to the ECS `log.logger`
 * value `plugins.alertingV2.<name>`, which is the primary axis an operator
 * filters on.
 */
export type AlertingSubsystemName =
  | 'routes'
  | 'rulesClient'
  | 'actionPolicyClient'
  | 'ruleExecutor'
  | 'director'
  | 'dispatcher'
  | 'executionHistory'
  | 'resources'
  | 'tasks'
  | 'savedObjects'
  | 'agentBuilder'
  | 'events';

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
