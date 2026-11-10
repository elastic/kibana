/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { types } from '@kbn/storage-adapter';
import { SUBJECT_CLAIM_INDEX_NAME, SUBJECT_INDEX_NAME } from '../../../common/subjects/constants';
import type { InvestigationSubject } from '../../../common/subjects/subject';

const userMapping = types.object({
  properties: {
    username: types.keyword({}),
    fullName: types.keyword({}),
    email: types.keyword({}),
    profileUid: types.keyword({}),
  },
});

/**
 * Mapping changes must stay additive: the adapter applies them in place with `putMapping`.
 * The alert snapshot is stored but not indexed; lookups go by subject type and id.
 */
export const subjectStorageSettings = {
  name: SUBJECT_INDEX_NAME,
  schema: {
    properties: {
      spaceId: types.keyword({}),
      conversationId: types.keyword({}),
      subjectType: types.keyword({}),
      subjectId: types.keyword({}),
      summary: types.text({}),
      triggerType: types.keyword({}),
      snapshot: types.object({ enabled: false }),
      slack: types.object({
        properties: {
          channel: types.keyword({}),
          thread_ts: types.keyword({}),
          status_message_ts: types.keyword({}),
          permalink: types.keyword({ index: false }),
          seen_events: types.object({
            properties: {
              event_id: types.keyword({ index: false }),
              execution_id: types.keyword({ index: false }),
            },
          }),
        },
      }),
      createdAt: types.date({}),
      updatedAt: types.date({}),
      createdBy: userMapping,
    },
  },
} satisfies IndexStorageSettings;

export type SubjectStorageSettings = typeof subjectStorageSettings;

/** Stored shape: the id lives in `_id`, everything else in `_source`. */
export type SubjectDocument = Omit<InvestigationSubject, 'id'>;

/** Which investigation a subject was first claimed for. Document id: hash of space, type, id. */
export interface SubjectClaimDocument {
  spaceId: string;
  /** The claiming investigation. */
  conversationId: string;
  subjectType: InvestigationSubject['subjectType'];
  subjectId: string;
  claimedAt: string;
  _id?: never;
}

export const subjectClaimStorageSettings = {
  name: SUBJECT_CLAIM_INDEX_NAME,
  schema: {
    properties: {
      spaceId: types.keyword({}),
      conversationId: types.keyword({}),
      subjectType: types.keyword({}),
      subjectId: types.keyword({}),
      claimedAt: types.date({}),
    },
  },
} satisfies IndexStorageSettings;

export type SubjectClaimStorageSettings = typeof subjectClaimStorageSettings;
