/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertAssignedTrigger } from './alert_assigned';
import { alertUnassignedTrigger } from './alert_unassigned';
import { alertAckedTrigger } from './alert_acked';
import { alertUnackedTrigger } from './alert_unacked';
import { alertTaggedTrigger } from './alert_tagged';
import { alertSnoozedTrigger } from './alert_snoozed';
import { alertUnsnoozedTrigger } from './alert_unsnoozed';
import { alertActivatedTrigger } from './alert_activated';
import { alertDeactivatedTrigger } from './alert_deactivated';
import type { AlertActionWorkflowTriggerBinding } from './types';

export type { AlertActionWorkflowTriggerBinding } from './types';
export { ALERT_ASSIGNED_TRIGGER_ID, alertAssignedTrigger } from './alert_assigned';
export { ALERT_UNASSIGNED_TRIGGER_ID, alertUnassignedTrigger } from './alert_unassigned';
export { ALERT_ACKED_TRIGGER_ID, alertAckedTrigger } from './alert_acked';
export { ALERT_UNACKED_TRIGGER_ID, alertUnackedTrigger } from './alert_unacked';
export { ALERT_TAGGED_TRIGGER_ID, alertTaggedTrigger } from './alert_tagged';
export { ALERT_SNOOZED_TRIGGER_ID, alertSnoozedTrigger } from './alert_snoozed';
export { ALERT_UNSNOOZED_TRIGGER_ID, alertUnsnoozedTrigger } from './alert_unsnoozed';
export { ALERT_ACTIVATED_TRIGGER_ID, alertActivatedTrigger } from './alert_activated';
export { ALERT_DEACTIVATED_TRIGGER_ID, alertDeactivatedTrigger } from './alert_deactivated';

/**
 * Catalog of every alert-action → workflow-trigger mapping owned by `alerting_v2`.
 *
 * Both the trigger-registration helper
 * (`server/lib/workflow_extensions/register_trigger_definitions.ts`) and the
 * `AlertActionWorkflowSubscriber` walk this single source so the registered
 * schema, the trigger id, and the runtime payload mapping cannot drift
 * across the codebase.
 *
 * To add a new alert-action event → workflow trigger:
 *
 *  1. Add the event type + discriminator constant to
 *     `alert_action_event_publisher/events.ts` and extend the
 *     `AlertActionEvent` union there.
 *  2. Create a binding file in this folder (mirror `alert_assigned.ts`).
 *  3. Append the binding to {@link ALERT_ACTION_WORKFLOW_TRIGGERS}.
 *
 * No other files need to change for the new trigger to be both registered
 * with workflows-extensions and dispatched by the subscriber.
 */
export const ALERT_ACTION_WORKFLOW_TRIGGERS: ReadonlyArray<AlertActionWorkflowTriggerBinding> = [
  alertAssignedTrigger,
  alertUnassignedTrigger,
  alertAckedTrigger,
  alertUnackedTrigger,
  alertTaggedTrigger,
  alertSnoozedTrigger,
  alertUnsnoozedTrigger,
  alertActivatedTrigger,
  alertDeactivatedTrigger,
];
