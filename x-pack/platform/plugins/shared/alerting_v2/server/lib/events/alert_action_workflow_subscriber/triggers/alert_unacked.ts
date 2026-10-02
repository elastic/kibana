/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { alertUnackedPayloadSchema } from '../../../../../common/workflows/triggers';
import {
  ALERT_UNACKED_TRIGGER_ID,
  alertUnackedTriggerCommonDefinition,
} from '../../../../../common/workflows/triggers';
import {
  EPISODE_UNACKED_EVENT_TYPE,
  type EpisodeUnackedEvent,
} from '../../alert_action_event_publisher/events';
import type { AlertActionWorkflowTriggerBinding } from './types';
import { toEnvelopePayload } from './to_envelope_payload';

export { ALERT_UNACKED_TRIGGER_ID } from '../../../../../common/workflows/triggers';

/**
 * Binding from the bus `episode.unacked` event to the
 * `alerting.actions.alertUnacked` workflow trigger.
 */
export const alertUnackedTrigger: AlertActionWorkflowTriggerBinding<
  EpisodeUnackedEvent,
  typeof alertUnackedPayloadSchema
> = {
  eventType: EPISODE_UNACKED_EVENT_TYPE,
  triggerId: ALERT_UNACKED_TRIGGER_ID,
  definition: alertUnackedTriggerCommonDefinition,
  toPayload: toEnvelopePayload,
};
