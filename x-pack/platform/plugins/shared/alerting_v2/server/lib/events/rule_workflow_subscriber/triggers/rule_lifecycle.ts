/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ruleLifecycleEventSchema } from '../../../../../common/workflows/triggers';
import {
  RuleCreatedTriggerId,
  ruleCreatedTriggerCommonDefinition,
  RuleDeletedTriggerId,
  ruleDeletedTriggerCommonDefinition,
  RuleDisabledTriggerId,
  ruleDisabledTriggerCommonDefinition,
  RuleEnabledTriggerId,
  ruleEnabledTriggerCommonDefinition,
  RuleUpdatedTriggerId,
  ruleUpdatedTriggerCommonDefinition,
} from '../../../../../common/workflows/triggers';
import {
  RULE_CREATED_EVENT_TYPE,
  RULE_DELETED_EVENT_TYPE,
  RULE_DISABLED_EVENT_TYPE,
  RULE_ENABLED_EVENT_TYPE,
  RULE_UPDATED_EVENT_TYPE,
  type RuleCreatedEvent,
  type RuleDeletedEvent,
  type RuleDisabledEvent,
  type RuleEnabledEvent,
  type RuleUpdatedEvent,
} from '../../rule_event_publisher/events';
import type { RuleEvent } from '../../rule_event_publisher/events';
import type { RuleWorkflowTriggerBinding } from './types';

const createRuleLifecycleBinding = <TEvent extends RuleEvent>(
  eventType: TEvent['type'],
  triggerId: string,
  definition: RuleWorkflowTriggerBinding<TEvent, typeof ruleLifecycleEventSchema>['definition']
): RuleWorkflowTriggerBinding<TEvent, typeof ruleLifecycleEventSchema> => ({
  eventType,
  triggerId,
  definition,
  toPayload: (event) => event.payload,
});

export const ruleCreatedTrigger: RuleWorkflowTriggerBinding<
  RuleCreatedEvent,
  typeof ruleLifecycleEventSchema
> = createRuleLifecycleBinding(
  RULE_CREATED_EVENT_TYPE,
  RuleCreatedTriggerId,
  ruleCreatedTriggerCommonDefinition
);

export const ruleUpdatedTrigger: RuleWorkflowTriggerBinding<
  RuleUpdatedEvent,
  typeof ruleLifecycleEventSchema
> = createRuleLifecycleBinding(
  RULE_UPDATED_EVENT_TYPE,
  RuleUpdatedTriggerId,
  ruleUpdatedTriggerCommonDefinition
);

export const ruleDeletedTrigger: RuleWorkflowTriggerBinding<
  RuleDeletedEvent,
  typeof ruleLifecycleEventSchema
> = createRuleLifecycleBinding(
  RULE_DELETED_EVENT_TYPE,
  RuleDeletedTriggerId,
  ruleDeletedTriggerCommonDefinition
);

export const ruleEnabledTrigger: RuleWorkflowTriggerBinding<
  RuleEnabledEvent,
  typeof ruleLifecycleEventSchema
> = createRuleLifecycleBinding(
  RULE_ENABLED_EVENT_TYPE,
  RuleEnabledTriggerId,
  ruleEnabledTriggerCommonDefinition
);

export const ruleDisabledTrigger: RuleWorkflowTriggerBinding<
  RuleDisabledEvent,
  typeof ruleLifecycleEventSchema
> = createRuleLifecycleBinding(
  RULE_DISABLED_EVENT_TYPE,
  RuleDisabledTriggerId,
  ruleDisabledTriggerCommonDefinition
);
