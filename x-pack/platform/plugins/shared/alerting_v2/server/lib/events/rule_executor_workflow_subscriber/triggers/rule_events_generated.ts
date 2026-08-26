/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ruleEventsGeneratedEventSchema } from '../../../../../common/workflows/triggers';
import {
  RuleEventsGeneratedTriggerId,
  ruleEventsGeneratedTriggerCommonDefinition,
} from '../../../../../common/workflows/triggers';
import {
  RULE_EXECUTION_SUCCEEDED_EVENT_TYPE,
  type RuleExecutionSucceededEvent,
} from '../../rule_executor_event_publisher/events';
import type { RuleExecutorWorkflowTriggerBinding } from './types';

export { RuleEventsGeneratedTriggerId } from '../../../../../common/workflows/triggers';

/**
 * Projects the bus `rule.execution.succeeded` domain event onto the
 * `alerting.ruleEventsGenerated` workflow trigger.
 *
 * The domain event fires on every successful run; this trigger only surfaces
 * the ones that produced rule events. It reshapes the flat bus payload into the
 * nested workflow payload and gates emission on `ruleEventsGenerated > 0`: a
 * successful run that produced no rule events has nothing for a consumer to
 * fetch from `.rule-events`, so we return `null` and the subscriber skips the
 * emit.
 *
 * Adding or renaming a field requires updating
 * {@link ruleEventsGeneratedEventSchema} and this mapping together so the
 * registered schema and the runtime payload stay in lockstep.
 */
export const ruleEventsGeneratedTrigger: RuleExecutorWorkflowTriggerBinding<
  RuleExecutionSucceededEvent,
  typeof ruleEventsGeneratedEventSchema
> = {
  eventType: RULE_EXECUTION_SUCCEEDED_EVENT_TYPE,
  triggerId: RuleEventsGeneratedTriggerId,
  definition: ruleEventsGeneratedTriggerCommonDefinition,
  toPayload: (event) => {
    const {
      executionId,
      scheduledAt,
      ruleEventsGenerated,
      rule: { ruleId, spaceId, kind, tags },
    } = event.payload;

    if (ruleEventsGenerated <= 0) {
      return null;
    }

    return {
      rule: { id: ruleId, spaceId, kind, tags: [...tags] },
      execution: { executionId, scheduledAt },
      ruleEventsGenerated,
    };
  },
};
