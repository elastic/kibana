/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { alertUnassignedPayloadSchema } from '../../../../../common/workflows/triggers';
import {
  ALERT_UNASSIGNED_TRIGGER_ID,
  alertUnassignedTriggerCommonDefinition,
} from '../../../../../common/workflows/triggers';
import {
  EPISODE_UNASSIGNED_EVENT_TYPE,
  type EpisodeUnassignedEvent,
} from '../../alert_action_event_publisher/events';
import type { AlertActionWorkflowTriggerBinding } from './types';
import { toEnvelopePayload } from './to_envelope_payload';

export { ALERT_UNASSIGNED_TRIGGER_ID } from '../../../../../common/workflows/triggers';

/**
 * Binding from the bus `episode.unassigned` event to the
 * `alerting.userActions.alertUnassigned` workflow trigger.
 */
export const alertUnassignedTrigger: AlertActionWorkflowTriggerBinding<
  EpisodeUnassignedEvent,
  typeof alertUnassignedPayloadSchema
> = {
  eventType: EPISODE_UNASSIGNED_EVENT_TYPE,
  triggerId: ALERT_UNASSIGNED_TRIGGER_ID,
  definition: alertUnassignedTriggerCommonDefinition,
  toPayload: toEnvelopePayload,
};
