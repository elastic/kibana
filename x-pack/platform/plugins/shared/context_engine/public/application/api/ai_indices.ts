/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import { AI_INDEX_API_VERSION, aiIndexPath } from '../../../common/constants';
import type { ListAiIndexResponse } from '../../../common/http_api/ai_indices';

interface ListAiIndicesArgs {
  signal?: AbortSignal;
}

export const listAiIndices = (
  http: HttpStart,
  { signal }: ListAiIndicesArgs = {}
): Promise<ListAiIndexResponse> =>
  http.get<ListAiIndexResponse>(aiIndexPath, {
    version: AI_INDEX_API_VERSION,
    ...(signal ? { signal } : {}),
  });
