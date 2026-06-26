/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { episodeDeactivatedPayloadSchema } from '../../../../../common/workflows/triggers';
import {
  EPISODE_DEACTIVATED_TRIGGER_ID,
  episodeDeactivatedTriggerCommonDefinition,
} from '../../../../../common/workflows/triggers';
import {
  EPISODE_DEACTIVATED_EVENT_TYPE,
  type EpisodeDeactivatedEvent,
} from '../../alert_action_event_publisher/events';
import type { AlertActionWorkflowTriggerBinding } from './types';
import { toEnvelopePayload } from './to_envelope_payload';

export { EPISODE_DEACTIVATED_TRIGGER_ID } from '../../../../../common/workflows/triggers';

/**
 * Binding from the bus `episode.deactivated` event to the
 * `alerting.episodeDeactivated` workflow trigger.
 */
export const episodeDeactivatedTrigger: AlertActionWorkflowTriggerBinding<
  EpisodeDeactivatedEvent,
  typeof episodeDeactivatedPayloadSchema
> = {
  eventType: EPISODE_DEACTIVATED_EVENT_TYPE,
  triggerId: EPISODE_DEACTIVATED_TRIGGER_ID,
  definition: episodeDeactivatedTriggerCommonDefinition,
  toPayload: (event) => ({ ...toEnvelopePayload(event), reason: event.payload.reason }),
};
