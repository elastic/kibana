/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type RootSchema, type EventTypeOpts } from '@elastic/ebt/client';

export enum EventMetric {
  INTERCEPT_TERMINATION_INTERACTION = 'intercept_termination_interaction',
  INTERCEPT_REGISTRATION = 'intercept_registration',
  INTERCEPT_OVERLOAD = 'intercept_overload',
}

export enum EventFieldType {
  INTERACTION_TYPE = 'interaction_type',
  INTERCEPT_ID = 'intercept_id',
  INTERACTION_DURATION = 'interaction_duration',
}

const fields: Record<EventFieldType, RootSchema<unknown>> = {
  [EventFieldType.INTERACTION_TYPE]: {
    [EventFieldType.INTERACTION_TYPE]: {
      type: 'keyword',
      _meta: {
        description: 'The type of interaction that occurred with the intercept',
        optional: false,
      },
    },
  },
  [EventFieldType.INTERCEPT_ID]: {
    [EventFieldType.INTERCEPT_ID]: {
      type: 'keyword',
      _meta: {
        description: 'ID of the intercept',
        optional: false,
      },
    },
  },
  [EventFieldType.INTERACTION_DURATION]: {
    [EventFieldType.INTERACTION_DURATION]: {
      type: 'long',
      _meta: {
        description: 'Duration of the interaction in milliseconds',
        optional: false,
      },
    },
  },
};

/**
 * @description defines all the event types that can be reported by the intercept dialog,
 * with the mapping that values provided will be ingested as within EBT
 */
export const eventTypes: Array<EventTypeOpts<Record<string, unknown>>> = [
  {
    eventType: EventMetric.INTERCEPT_TERMINATION_INTERACTION,
    schema: {
      ...fields[EventFieldType.INTERACTION_TYPE],
      ...fields[EventFieldType.INTERCEPT_ID],
      ...fields[EventFieldType.INTERACTION_DURATION],
    },
  },
  {
    eventType: EventMetric.INTERCEPT_REGISTRATION,
    schema: {
      ...fields[EventFieldType.INTERCEPT_ID],
    },
  },
  {
    eventType: EventMetric.INTERCEPT_OVERLOAD,
    schema: {
      ...fields[EventFieldType.INTERCEPT_ID],
    },
  },
];
