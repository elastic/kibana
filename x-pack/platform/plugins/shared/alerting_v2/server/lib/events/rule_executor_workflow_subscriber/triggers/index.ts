/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ruleEventsGeneratedTrigger } from './rule_events_generated';
import { ruleExecutionFailedTrigger } from './rule_execution_failed';
import type { RuleExecutorWorkflowTriggerBinding } from './types';

export type { RuleExecutorWorkflowTriggerBinding } from './types';
export { RuleEventsGeneratedTriggerId, ruleEventsGeneratedTrigger } from './rule_events_generated';
export { RuleExecutionFailedTriggerId, ruleExecutionFailedTrigger } from './rule_execution_failed';

/**
 * Catalog of every rule-executor → workflow-trigger mapping owned by `alerting_v2`.
 *
 * Both the trigger-registration helper
 * (`server/lib/workflow_extensions/register_trigger_definitions.ts`) and the
 * `RuleExecutorWorkflowSubscriber` walk this single source so the registered
 * schema, the trigger id, and the runtime payload mapping cannot drift across
 * the codebase.
 *
 * To add a new rule-executor event → workflow trigger:
 *
 *  1. Add the event type + discriminator constant to
 *     `rule_executor_event_publisher/events.ts` and extend the
 *     `RuleExecutorEvent` union there.
 *  2. Create a binding file in this folder (mirror `rule_events_generated.ts`).
 *     Return `null` from `toPayload` to gate emission for specific runs.
 *  3. Append the binding to {@link RULE_EXECUTOR_WORKFLOW_TRIGGERS}.
 */
export const RULE_EXECUTOR_WORKFLOW_TRIGGERS: ReadonlyArray<RuleExecutorWorkflowTriggerBinding> = [
  ruleEventsGeneratedTrigger,
  ruleExecutionFailedTrigger,
];
