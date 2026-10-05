/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { types } from '@kbn/storage-adapter';
import { TIMELINE_INDEX_NAME } from '../../../common/timeline/constants';
import type { InvestigationTimeline } from '../../../common/timeline/timeline';

/**
 * Mapping changes must stay additive: the adapter applies them in place with `putMapping`.
 * The events are stored but not indexed; readers load them by conversation.
 */
export const timelineStorageSettings = {
  name: TIMELINE_INDEX_NAME,
  schema: {
    properties: {
      spaceId: types.keyword({}),
      conversationId: types.keyword({}),
      events: types.object({ enabled: false }),
      createdAt: types.date({}),
      updatedAt: types.date({}),
      createdBy: types.object({
        properties: {
          username: types.keyword({}),
          fullName: types.keyword({}),
          email: types.keyword({}),
          profileUid: types.keyword({}),
        },
      }),
    },
  },
} satisfies IndexStorageSettings;

export type TimelineStorageSettings = typeof timelineStorageSettings;

/** Stored shape: the id lives in `_id`, everything else in `_source`. */
export type TimelineDocument = Omit<InvestigationTimeline, 'id'>;
