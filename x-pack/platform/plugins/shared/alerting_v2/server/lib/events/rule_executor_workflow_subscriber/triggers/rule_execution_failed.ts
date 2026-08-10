/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ruleExecutionFailedEventSchema } from '../../../../../common/workflows/triggers';
import {
  RuleExecutionFailedTriggerId,
  RULE_EXECUTION_FAILED_ERROR_MAX_LENGTH,
  ruleExecutionFailedTriggerCommonDefinition,
} from '../../../../../common/workflows/triggers';
import {
  RULE_EXECUTION_FAILED_EVENT_TYPE,
  type RuleExecutionFailedEvent,
} from '../../rule_executor_event_publisher/events';
import type { RuleExecutorWorkflowTriggerBinding } from './types';

export { RuleExecutionFailedTriggerId } from '../../../../../common/workflows/triggers';

/**
 * Binding from the bus `rule.execution.failed` event to the
 * `alerting.ruleExecutionFailed` workflow trigger.
 *
 * Emits on every failed run (no gate). The error message is truncated to
 * {@link RULE_EXECUTION_FAILED_ERROR_MAX_LENGTH} because the workflow engine
 * rejects payloads that exceed the schema bound — truncating keeps the failure
 * event flowing (degrade gently) instead of dropping it. Adding or renaming a
 * field requires updating {@link ruleExecutionFailedEventSchema} and this
 * mapping together so the registered schema and the runtime payload stay in
 * lockstep.
 */
export const ruleExecutionFailedTrigger: RuleExecutorWorkflowTriggerBinding<
  RuleExecutionFailedEvent,
  typeof ruleExecutionFailedEventSchema
> = {
  eventType: RULE_EXECUTION_FAILED_EVENT_TYPE,
  triggerId: RuleExecutionFailedTriggerId,
  definition: ruleExecutionFailedTriggerCommonDefinition,
  toPayload: (event) => ({
    rule: { id: event.payload.rule.id, spaceId: event.payload.rule.spaceId },
    error: event.payload.error.slice(0, RULE_EXECUTION_FAILED_ERROR_MAX_LENGTH),
  }),
};
