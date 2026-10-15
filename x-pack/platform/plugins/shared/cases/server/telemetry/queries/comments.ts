/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_ATTACHMENT_SAVED_OBJECT, CASE_COMMENT_SAVED_OBJECT } from '../../../common/constants';
import { COMMENT_ATTACHMENT_TYPE, LEGACY_USER_TYPE } from '../../../common/constants/attachments';
import { buildFilter } from '../../client/utils';
import type { CasesTelemetry, CollectTelemetryDataParams } from '../types';
import { getCountsData, getMaxCounterOnACase } from './utils';

export const getUserCommentsTelemetryData = async ({
  savedObjectsClient,
}: CollectTelemetryDataParams): Promise<CasesTelemetry['comments']> => {
  const [legacyRes, unifiedRes, maxOnACase] = await Promise.all([
    getCountsData({
      savedObjectsClient,
      savedObjectType: CASE_COMMENT_SAVED_OBJECT,
      filter: buildFilter({
        filters: [LEGACY_USER_TYPE],
        field: 'type',
        operator: 'or',
        type: CASE_COMMENT_SAVED_OBJECT,
      }),
    }),
    getCountsData({
      savedObjectsClient,
      savedObjectType: CASE_ATTACHMENT_SAVED_OBJECT,
      filter: buildFilter({
        filters: [COMMENT_ATTACHMENT_TYPE],
        field: 'type',
        operator: 'or',
        type: CASE_ATTACHMENT_SAVED_OBJECT,
      }),
    }),
    // `maxOnACase` is sourced from the denormalized `total_comments` counter, which
    // already combines legacy and unified comments (so a mixed case isn't split).
    getMaxCounterOnACase(savedObjectsClient, 'total_comments'),
  ]);

  return {
    all: {
      // Counts are disjoint doc sets across the two saved objects, so they sum exactly.
      total: legacyRes.all.total + unifiedRes.all.total,
      daily: legacyRes.all.daily + unifiedRes.all.daily,
      weekly: legacyRes.all.weekly + unifiedRes.all.weekly,
      monthly: legacyRes.all.monthly + unifiedRes.all.monthly,
      maxOnACase: maxOnACase.all,
    },
  };
};
