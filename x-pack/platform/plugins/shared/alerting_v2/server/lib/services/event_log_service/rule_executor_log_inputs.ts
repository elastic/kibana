/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExecutionMetricsSnapshot } from '../../rule_executor/metrics';
import type {
  RuleExecutorExecutionStatus,
  RuleExecutorReason,
} from '../../rule_executor/event_log/constants';

/**
 * Input DTO for {@link EventLogServiceContract.logRuleExecuteStart}.
 *
 * A typed shape rather than a bare `IEvent` so callers stay decoupled from
 * the event-log plugin's schema.
 */
export interface RuleExecuteStartLogInput {
  readonly executionUuid: string;
  readonly ruleId: string;
  readonly spaceId: string;
  /** Pipeline start (run-claim time). */
  readonly start: Date;
}

/**
 * Rule attributes captured at execution time and persisted on the `execute`
 * event-log document. The values reflect the rule **as it ran** so a later
 * edit / delete of the rule does not change the historic record.
 */
export interface RuleAttributesSnapshot {
  readonly id: string;
  readonly name?: string;
  readonly kind?: string;
  readonly version?: number;
  readonly tags?: readonly string[];
  readonly query?: readonly string[];
}

/**
 * Input DTO for {@link EventLogServiceContract.logRuleExecute}.
 */
export interface RuleExecuteLogInput {
  readonly executionUuid: string;
  readonly ruleId: string;
  readonly spaceId: string;
  readonly start: Date;
  readonly end: Date;
  readonly status: RuleExecutorExecutionStatus;
  readonly reason?: RuleExecutorReason;
  /** Set on `failed` and `timeout` outcomes. */
  readonly error?: { message: string; stackTrace?: string };
  readonly metrics: ExecutionMetricsSnapshot;
  readonly rule?: RuleAttributesSnapshot;
}
