/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core-http-browser';
import type { IndicesGetMappingIndexMappingRecord } from '@elastic/elasticsearch/lib/api/types';

import * as i18n from '../translations';
import { INTERNAL_API_VERSION } from '../helpers';

export const MAPPINGS_API_ROUTE = '/internal/ecs_data_quality_dashboard/mappings';

export async function fetchMappings({
  abortController,
  httpFetch,
  patternOrIndexName,
}: {
  abortController: AbortController;
  httpFetch: HttpHandler;
  patternOrIndexName: string;
}): Promise<Record<string, IndicesGetMappingIndexMappingRecord>> {
  const encodedIndexName = encodeURIComponent(`${patternOrIndexName}`);

  try {
    return await httpFetch<Record<string, IndicesGetMappingIndexMappingRecord>>(
      `${MAPPINGS_API_ROUTE}/${encodedIndexName}`,
      {
        method: 'GET',
        signal: abortController.signal,
        version: INTERNAL_API_VERSION,
      }
    );
  } catch (e) {
    throw new Error(i18n.ERROR_LOADING_MAPPINGS({ details: e.message, patternOrIndexName }));
  }
}
