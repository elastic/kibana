/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { episodeAssignedTrigger } from './episode_assigned';
import type { AlertActionWorkflowTriggerBinding } from './types';

export type { AlertActionWorkflowTriggerBinding } from './types';
export { EPISODE_ASSIGNED_TRIGGER_ID, episodeAssignedTrigger } from './episode_assigned';

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
 *  2. Create a binding file in this folder (mirror `episode_assigned.ts`).
 *  3. Append the binding to {@link ALERT_ACTION_WORKFLOW_TRIGGERS}.
 *
 * No other files need to change for the new trigger to be both registered
 * with workflows-extensions and dispatched by the subscriber.
 */
export const ALERT_ACTION_WORKFLOW_TRIGGERS: ReadonlyArray<AlertActionWorkflowTriggerBinding> = [
  episodeAssignedTrigger,
];
