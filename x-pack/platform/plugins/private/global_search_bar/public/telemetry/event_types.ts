/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RootSchema, EventTypeOpts } from '@kbn/core/public';
import { EventMetric, FieldType } from '../types';

const fields: Record<FieldType, RootSchema<Record<string, unknown>>> = {
  [FieldType.APPLICATION]: {
    [FieldType.APPLICATION]: {
      type: 'keyword',
      _meta: {
        description: 'The name of the application selected in the global search bar results.',
      },
    },
  },
  [FieldType.SAVED_OBJECT_TYPE]: {
    [FieldType.SAVED_OBJECT_TYPE]: {
      type: 'keyword',
      _meta: {
        description: 'The type of the saved object selected in the global search bar results.',
      },
    },
  },
  [FieldType.FOCUS_TIME]: {
    [FieldType.FOCUS_TIME]: {
      type: 'long',
      _meta: {
        description: 'The length in milliseconds the global search bar had the cursor focused.',
      },
    },
  },
  [FieldType.SELECTED_RANK]: {
    [FieldType.SELECTED_RANK]: {
      type: 'short',
      _meta: {
        description: 'The ranking of placement of the selected option in the results list.',
      },
    },
  },
  [FieldType.SELECTED_LABEL]: {
    [FieldType.SELECTED_LABEL]: {
      type: 'keyword',
      _meta: {
        description: 'The text of the selected option in the results list.',
      },
    },
  },
  [FieldType.ERROR_MESSAGE]: {
    [FieldType.ERROR_MESSAGE]: {
      type: 'keyword',
      _meta: { description: 'A message from an error that was caught.' },
    },
  },
  [FieldType.TERMS]: {
    [FieldType.TERMS]: {
      type: 'keyword',
      _meta: { description: 'The search terms entered by the user.' },
    },
  },
};

export const eventTypes: Array<EventTypeOpts<Record<string, unknown>>> = [
  {
    eventType: EventMetric.CLICK_APPLICATION,
    schema: {
      ...fields[FieldType.APPLICATION],
      ...fields[FieldType.TERMS],
      ...fields[FieldType.SELECTED_RANK],
      ...fields[FieldType.SELECTED_LABEL],
    },
  },
  {
    eventType: EventMetric.CLICK_SAVED_OBJECT,
    schema: {
      ...fields[FieldType.SAVED_OBJECT_TYPE],
      ...fields[FieldType.TERMS],
      ...fields[FieldType.SELECTED_RANK],
      ...fields[FieldType.SELECTED_LABEL],
    },
  },
  {
    eventType: EventMetric.SEARCH_BLUR,
    schema: {
      ...fields[FieldType.FOCUS_TIME],
    },
  },
  {
    eventType: EventMetric.ERROR,
    schema: {
      ...fields[FieldType.ERROR_MESSAGE],
      ...fields[FieldType.TERMS],
    },
  },
];
