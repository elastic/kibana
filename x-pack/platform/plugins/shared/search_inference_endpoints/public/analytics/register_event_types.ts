/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, EventTypeOpts } from '@kbn/core/public';

import { EventType } from './event_tracker';

const eventTypes: Array<EventTypeOpts<Record<string, unknown>>> = [
  { eventType: EventType.ENDPOINT_CREATED, schema: {} },
  { eventType: EventType.ENDPOINT_DELETED, schema: {} },
  { eventType: EventType.ENDPOINT_EDITED, schema: {} },
  { eventType: EventType.DEFAULT_MODEL_CHANGED, schema: {} },
  { eventType: EventType.FEATURE_SETTINGS_SAVED, schema: {} },
  {
    eventType: EventType.FILTER_APPLIED,
    schema: {
      filter: {
        type: 'keyword',
        _meta: { description: 'Identifier of the filter popover the user interacted with.' },
      },
    },
  },
  {
    eventType: EventType.GROUP_BY_CHANGED,
    schema: {
      group_by: {
        type: 'keyword',
        _meta: { description: 'The group-by option selected by the user.' },
      },
    },
  },
  { eventType: EventType.ENDPOINT_USAGE_SCANNED, schema: {} },
  { eventType: EventType.EMPTY_STATE_VIEWED, schema: {} },
  {
    eventType: EventType.API_ERROR,
    schema: {
      operation: {
        type: 'keyword',
        _meta: { description: 'The operation that failed (e.g. delete).' },
      },
    },
  },
  {
    eventType: EventType.FLYOUT_OPENED,
    schema: {
      flyout: {
        type: 'keyword',
        _meta: { description: 'Identifier of the flyout that was opened.' },
      },
    },
  },
  {
    eventType: EventType.FLYOUT_CLOSED,
    schema: {
      flyout: {
        type: 'keyword',
        _meta: { description: 'Identifier of the flyout that was closed.' },
      },
    },
  },
  {
    eventType: EventType.MODAL_OPENED,
    schema: {
      modal: {
        type: 'keyword',
        _meta: { description: 'Identifier of the modal that was opened.' },
      },
    },
  },
  { eventType: EventType.MODAL_CLOSED, schema: {} },
  {
    eventType: EventType.EIS_MODEL_VIEWED,
    schema: {
      model_id: {
        type: 'keyword',
        _meta: { description: 'Identifier of the Elastic Inference Service model viewed.' },
      },
    },
  },
];

export const registerSearchInferenceEndpointsEventTypes = (analytics: AnalyticsServiceSetup) => {
  for (const eventType of eventTypes) {
    analytics.registerEventType(eventType);
  }
};
