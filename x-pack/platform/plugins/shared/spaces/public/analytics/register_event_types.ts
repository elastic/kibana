/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, EventTypeOpts, RootSchema } from '@kbn/core/public';

import { EventType, FieldType } from './event_tracker';

const fields: Record<FieldType, RootSchema<Record<string, unknown>>> = {
  [FieldType.SPACE_ID]: {
    [FieldType.SPACE_ID]: {
      type: 'keyword',
      _meta: {
        description: 'The ID of the space.',
      },
    },
  },
  [FieldType.SPACE_ID_PREV]: {
    [FieldType.SPACE_ID_PREV]: {
      type: 'keyword',
      _meta: {
        description: 'The previous ID of the space (before switching space).',
      },
    },
  },
  [FieldType.SOLUTION]: {
    [FieldType.SOLUTION]: {
      type: 'keyword',
      _meta: {
        description: 'The solution set for the space.',
      },
    },
  },
  [FieldType.SOLUTION_PREV]: {
    [FieldType.SOLUTION_PREV]: {
      type: 'keyword',
      _meta: {
        description: 'The previous solution value before editing the space.',
        optional: true,
      },
    },
  },
  [FieldType.ACTION]: {
    [FieldType.ACTION]: {
      type: 'keyword',
      _meta: {
        description: 'The user action, either create or edit a space.',
      },
    },
  },
};

const eventTypes: Array<EventTypeOpts<Record<string, unknown>>> = [
  {
    eventType: EventType.SPACE_SOLUTION_CHANGED,
    schema: {
      ...fields[FieldType.SPACE_ID],
      ...fields[FieldType.SOLUTION_PREV],
      ...fields[FieldType.SOLUTION],
      ...fields[FieldType.ACTION],
    },
  },
  {
    eventType: EventType.SPACE_CHANGED,
    schema: {
      ...fields[FieldType.SPACE_ID],
      ...fields[FieldType.SPACE_ID_PREV],
      ...fields[FieldType.SOLUTION_PREV],
      ...fields[FieldType.SOLUTION],
    },
  },
];

export function registerSpacesEventTypes(core: CoreSetup) {
  const { analytics } = core;
  for (const eventType of eventTypes) {
    analytics.registerEventType(eventType);
  }
}
