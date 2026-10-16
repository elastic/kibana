/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RuleChangesHistoryAction,
  type RuleChangesHistoryActionType,
  type RuleChangesHistoryEventType,
} from '../../rule_changes_history';
import {
  RULE_CREATED_EVENT_TYPE,
  RULE_DELETED_EVENT_TYPE,
  RULE_DISABLED_EVENT_TYPE,
  RULE_ENABLED_EVENT_TYPE,
  RULE_UPDATED_EVENT_TYPE,
  type RuleEvent,
} from '../rule_event_publisher/events';

/** How a rule-lifecycle event maps onto change-history ECS fields. */
export interface RuleChangesHistoryMapping {
  /** ECS `event.action`. */
  readonly action: RuleChangesHistoryActionType;
  /** ECS `event.type`. */
  readonly eventType: RuleChangesHistoryEventType;
}

/**
 * Maps each rule-lifecycle event type to the change-history `action`/`eventType`
 * pair logged for it. Enable/disable are ordinary configuration changes, so both
 * categorise as `change`.
 */
export const RULE_LIFECYCLE_TO_CHANGES_HISTORY_MAP: Readonly<
  Record<RuleEvent['type'], RuleChangesHistoryMapping>
> = {
  [RULE_CREATED_EVENT_TYPE]: { action: RuleChangesHistoryAction.ruleCreate, eventType: 'creation' },
  [RULE_UPDATED_EVENT_TYPE]: { action: RuleChangesHistoryAction.ruleUpdate, eventType: 'change' },
  [RULE_ENABLED_EVENT_TYPE]: { action: RuleChangesHistoryAction.ruleEnable, eventType: 'change' },
  [RULE_DISABLED_EVENT_TYPE]: { action: RuleChangesHistoryAction.ruleDisable, eventType: 'change' },
  [RULE_DELETED_EVENT_TYPE]: { action: RuleChangesHistoryAction.ruleDelete, eventType: 'deletion' },
};
