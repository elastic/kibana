/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { episodeActivatedPayloadSchema } from '../../../../../common/workflows/triggers';
import {
  EPISODE_ACTIVATED_TRIGGER_ID,
  episodeActivatedTriggerCommonDefinition,
} from '../../../../../common/workflows/triggers';
import {
  EPISODE_ACTIVATED_EVENT_TYPE,
  type EpisodeActivatedEvent,
} from '../../alert_action_event_publisher/events';
import type { AlertActionWorkflowTriggerBinding } from './types';
import { toEnvelopePayload } from './to_envelope_payload';

export { EPISODE_ACTIVATED_TRIGGER_ID } from '../../../../../common/workflows/triggers';

/**
 * Binding from the bus `episode.activated` event to the
 * `alerting.episodeActivated` workflow trigger.
 */
export const episodeActivatedTrigger: AlertActionWorkflowTriggerBinding<
  EpisodeActivatedEvent,
  typeof episodeActivatedPayloadSchema
> = {
  eventType: EPISODE_ACTIVATED_EVENT_TYPE,
  triggerId: EPISODE_ACTIVATED_TRIGGER_ID,
  definition: episodeActivatedTriggerCommonDefinition,
  toPayload: (event) => ({ ...toEnvelopePayload(event), reason: event.payload.reason }),
};
