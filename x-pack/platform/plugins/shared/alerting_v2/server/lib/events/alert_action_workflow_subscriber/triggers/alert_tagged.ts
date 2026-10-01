/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { alertTaggedPayloadSchema } from '../../../../../common/workflows/triggers';
import {
  ALERT_TAGGED_TRIGGER_ID,
  alertTaggedTriggerCommonDefinition,
} from '../../../../../common/workflows/triggers';
import {
  EPISODE_TAGGED_EVENT_TYPE,
  type EpisodeTaggedEvent,
} from '../../alert_action_event_publisher/events';
import type { AlertActionWorkflowTriggerBinding } from './types';
import { toEnvelopePayload } from './to_envelope_payload';

export { ALERT_TAGGED_TRIGGER_ID } from '../../../../../common/workflows/triggers';

/**
 * Binding from the bus `episode.tagged` event to the
 * `alerting.userActions.alertTagged` workflow trigger.
 */
export const alertTaggedTrigger: AlertActionWorkflowTriggerBinding<
  EpisodeTaggedEvent,
  typeof alertTaggedPayloadSchema
> = {
  eventType: EPISODE_TAGGED_EVENT_TYPE,
  triggerId: ALERT_TAGGED_TRIGGER_ID,
  definition: alertTaggedTriggerCommonDefinition,
  toPayload: (event) => ({ ...toEnvelopePayload(event), tags: [...event.payload.tags] }),
};
