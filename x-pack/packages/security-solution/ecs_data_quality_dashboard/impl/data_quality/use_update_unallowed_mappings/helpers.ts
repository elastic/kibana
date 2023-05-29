/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpHandler } from '@kbn/core-http-browser';
import * as i18n from '../translations';
import type { IndexInfo } from '../types';
const INDEX_INFO_ROUTE = '/app/management/data/index_management/indices?includeHiddenIndices=true';

export const fetchIndicesInfo = async ({
  abortController,
  httpFetch,
  indexNames,
}: {
  abortController?: AbortController;
  httpFetch: HttpHandler;
  indexNames: string[];
}): Promise<IndexInfo[]> => {
  try {
    return await httpFetch<IndexInfo[]>(INDEX_INFO_ROUTE, {
      body: JSON.stringify(indexNames),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      signal: abortController?.signal,
    });
  } catch (e) {
    throw new Error(
      i18n.ERROR_FETCHING_INDICES_DATA({
        details: e.message,
      })
    );
  }
};
