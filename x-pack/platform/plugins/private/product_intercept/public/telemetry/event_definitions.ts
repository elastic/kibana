/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type RootSchema, type EventTypeOpts } from '@elastic/ebt/client';

export enum EventMetric {
  PRODUCT_INTERCEPT_TERMINATION_INTERACTION = 'product_intercept_termination_interaction',
  PRODUCT_INTERCEPT_PROGRESS_INTERACTION = 'product_intercept_interaction_progress',
  PRODUCT_INTERCEPT_TRIGGER_FETCH_ERROR = 'product_intercept_trigger_fetch_error',
}

export enum EventFieldType {
  INTERACTION_TYPE = 'interaction_type',
  INTERCEPT_RUN_ID = 'interaction_run_id',
  INTERACTION_METRIC = 'interaction_metric',
  INTERACTION_METRIC_VALUE = 'interaction_metric_value',
  TRIGGER_FETCH_ERROR_MESSAGE = 'trigger_fetch_error_message',
}

const fields: Record<EventFieldType, RootSchema<unknown>> = {
  [EventFieldType.INTERCEPT_RUN_ID]: {
    [EventFieldType.INTERCEPT_RUN_ID]: {
      type: 'keyword',
      _meta: {
        description: 'The id of the product intercept run',
        optional: false,
      },
    },
  },
  [EventFieldType.INTERACTION_TYPE]: {
    [EventFieldType.INTERACTION_TYPE]: {
      type: 'keyword',
      _meta: {
        description: 'The type of interaction that occurred with the intercept',
        optional: false,
      },
    },
  },
  [EventFieldType.INTERACTION_METRIC]: {
    [EventFieldType.INTERACTION_METRIC]: {
      type: 'keyword',
      _meta: {
        description: 'The interaction metric id of of the product intercept',
        optional: false,
      },
    },
  },
  [EventFieldType.INTERACTION_METRIC_VALUE]: {
    [EventFieldType.INTERACTION_METRIC_VALUE]: {
      type: 'long',
      _meta: {
        description: 'The value for the interaction metric id of of the product intercept',
        optional: false,
      },
    },
  },
  [EventFieldType.TRIGGER_FETCH_ERROR_MESSAGE]: {
    [EventFieldType.TRIGGER_FETCH_ERROR_MESSAGE]: {
      type: 'text',
      _meta: {
        description: 'The error message from the trigger fetch',
        optional: false,
      },
    },
  },
};

/**
 * @description defines all the event types that can be reported by the product intercept dialog,
 * with the mapping that values provided will be ingested as within EBT
 */
export const eventTypes: Array<EventTypeOpts<Record<string, unknown>>> = [
  {
    eventType: EventMetric.PRODUCT_INTERCEPT_TERMINATION_INTERACTION,
    schema: {
      ...fields[EventFieldType.INTERACTION_TYPE],
      ...fields[EventFieldType.INTERCEPT_RUN_ID],
    },
  },
  {
    eventType: EventMetric.PRODUCT_INTERCEPT_PROGRESS_INTERACTION,
    schema: {
      ...fields[EventFieldType.INTERACTION_METRIC],
      ...fields[EventFieldType.INTERACTION_METRIC_VALUE],
      ...fields[EventFieldType.INTERCEPT_RUN_ID],
    },
  },
  {
    eventType: EventMetric.PRODUCT_INTERCEPT_TRIGGER_FETCH_ERROR,
    schema: {
      ...fields[EventFieldType.TRIGGER_FETCH_ERROR_MESSAGE],
    },
  },
];
