/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexStorageSettings } from '@kbn/storage-adapter';
import { types } from '@kbn/storage-adapter';
import { HYPOTHESES_INDEX_NAME } from '../../../common/hypotheses/constants';
import type { InvestigationHypotheses } from '../../../common/hypotheses/hypotheses';

/**
 * Mapping changes must stay additive: the adapter applies them in place with `putMapping`.
 * The hypotheses are stored but not indexed; readers load them by conversation.
 */
export const hypothesesStorageSettings = {
  name: HYPOTHESES_INDEX_NAME,
  schema: {
    properties: {
      spaceId: types.keyword({}),
      conversationId: types.keyword({}),
      hypotheses: types.object({ enabled: false }),
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

export type HypothesesStorageSettings = typeof hypothesesStorageSettings;

/** Stored shape: the id lives in `_id`, everything else in `_source`. */
export type HypothesesDocument = Omit<InvestigationHypotheses, 'id'>;
