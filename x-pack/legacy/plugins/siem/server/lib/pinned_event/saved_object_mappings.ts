/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchMappingOf } from '../../utils/typed_elasticsearch_mappings';
import { SavedPinnedEvent } from './types';

export const pinnedEventSavedObjectType = 'siem-ui-timeline-pinned-event';

export const pinnedEventSavedObjectMappings: {
  [pinnedEventSavedObjectType]: ElasticsearchMappingOf<SavedPinnedEvent>;
} = {
  [pinnedEventSavedObjectType]: {
    properties: {
      timelineId: {
        type: 'keyword',
      },
      eventId: {
        type: 'keyword',
      },
      created: {
        type: 'date',
      },
      createdBy: {
        type: 'text',
      },
      updated: {
        type: 'date',
      },
      updatedBy: {
        type: 'text',
      },
    },
  },
};
