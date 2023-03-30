/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesGetMappingIndexMappingRecord } from '@elastic/elasticsearch/lib/api/types';

import * as i18n from '../translations';

export const MAPPINGS_API_ROUTE = '/internal/ecs_data_quality_dashboard/mappings';

export async function fetchMappings({
  abortController,
  patternOrIndexName,
}: {
  abortController: AbortController;
  patternOrIndexName: string;
}): Promise<Record<string, IndicesGetMappingIndexMappingRecord>> {
  const encodedIndexName = encodeURIComponent(`${patternOrIndexName}`);

  const response = await fetch(`${MAPPINGS_API_ROUTE}/${encodedIndexName}`, {
    method: 'GET',
    signal: abortController.signal,
  });

  if (response.ok) {
    return response.json();
  }

  throw new Error(
    i18n.ERROR_LOADING_MAPPINGS({ details: response.statusText, patternOrIndexName })
  );
}
