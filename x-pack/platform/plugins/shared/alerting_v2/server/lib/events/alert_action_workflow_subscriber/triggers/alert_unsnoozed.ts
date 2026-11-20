/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { alertUnsnoozedPayloadSchema } from '../../../../../common/workflows/triggers';
import {
  ALERT_UNSNOOZED_TRIGGER_ID,
  alertUnsnoozedTriggerCommonDefinition,
} from '../../../../../common/workflows/triggers';
import {
  EPISODE_UNSNOOZED_EVENT_TYPE,
  type EpisodeUnsnoozedEvent,
} from '../../alert_action_event_publisher/events';
import type { AlertActionWorkflowTriggerBinding } from './types';
import { toEnvelopePayload } from './to_envelope_payload';

export { ALERT_UNSNOOZED_TRIGGER_ID } from '../../../../../common/workflows/triggers';

/**
 * Binding from the bus `episode.unsnoozed` event to the
 * `alerting.actions.alertUnsnoozed` workflow trigger.
 */
export const alertUnsnoozedTrigger: AlertActionWorkflowTriggerBinding<
  EpisodeUnsnoozedEvent,
  typeof alertUnsnoozedPayloadSchema
> = {
  eventType: EPISODE_UNSNOOZED_EVENT_TYPE,
  triggerId: ALERT_UNSNOOZED_TRIGGER_ID,
  definition: alertUnsnoozedTriggerCommonDefinition,
  toPayload: toEnvelopePayload,
};
