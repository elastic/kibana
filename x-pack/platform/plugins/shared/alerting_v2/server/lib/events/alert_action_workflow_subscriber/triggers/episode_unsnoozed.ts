/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { episodeUnsnoozedPayloadSchema } from '../../../../../common/workflows/triggers';
import {
  EPISODE_UNSNOOZED_TRIGGER_ID,
  episodeUnsnoozedTriggerCommonDefinition,
} from '../../../../../common/workflows/triggers';
import {
  EPISODE_UNSNOOZED_EVENT_TYPE,
  type EpisodeUnsnoozedEvent,
} from '../../alert_action_event_publisher/events';
import type { AlertActionWorkflowTriggerBinding } from './types';
import { toEnvelopePayload } from './to_envelope_payload';

export { EPISODE_UNSNOOZED_TRIGGER_ID } from '../../../../../common/workflows/triggers';

/**
 * Binding from the bus `episode.unsnoozed` event to the
 * `alerting.episodeUnsnoozed` workflow trigger.
 */
export const episodeUnsnoozedTrigger: AlertActionWorkflowTriggerBinding<
  EpisodeUnsnoozedEvent,
  typeof episodeUnsnoozedPayloadSchema
> = {
  eventType: EPISODE_UNSNOOZED_EVENT_TYPE,
  triggerId: EPISODE_UNSNOOZED_TRIGGER_ID,
  definition: episodeUnsnoozedTriggerCommonDefinition,
  toPayload: toEnvelopePayload,
};
