/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPath } from '@kbn/core-http-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import {
  AI_INDEX_INTERNAL_API_VERSION,
  AI_INDEX_SPEND_PATH,
  SPACE_SPEND_PATH,
} from '../../../common/constants';
import type { AiIndexSpendResponse, SpaceSpendResponse } from '../../../common/spend';

/** Month-to-date AI spend of an AI index next to the totals of its space. */
export const getAiIndexSpend = (
  http: HttpStart,
  { aiIndexId, signal }: { aiIndexId: string; signal?: AbortSignal }
): Promise<AiIndexSpendResponse> =>
  http.get<AiIndexSpendResponse>(buildPath(AI_INDEX_SPEND_PATH, { aiIndexId }), {
    version: AI_INDEX_INTERNAL_API_VERSION,
    ...(signal ? { signal } : {}),
  });

/** Month-to-date AI spend of the space and of each of its AI indices. */
export const getSpaceSpend = (
  http: HttpStart,
  { signal }: { signal?: AbortSignal } = {}
): Promise<SpaceSpendResponse> =>
  http.get<SpaceSpendResponse>(SPACE_SPEND_PATH, {
    version: AI_INDEX_INTERNAL_API_VERSION,
    ...(signal ? { signal } : {}),
  });
