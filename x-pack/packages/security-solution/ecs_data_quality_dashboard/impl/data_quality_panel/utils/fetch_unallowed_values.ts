/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core-http-browser';

import { INTERNAL_API_VERSION } from '../constants';
import * as i18n from '../translations';
import type {
  Bucket,
  UnallowedValueCount,
  UnallowedValueRequestItem,
  UnallowedValueSearchResult,
} from '../types';

export const isBucket = (maybeBucket: unknown): maybeBucket is Bucket =>
  maybeBucket != null &&
  typeof (maybeBucket as Bucket).key === 'string' &&
  typeof (maybeBucket as Bucket).doc_count === 'number';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const getUnallowedValueCount = ({ doc_count, key }: Bucket): UnallowedValueCount => ({
  count: doc_count,
  fieldName: key,
});

export const getUnallowedValues = ({
  requestItems,
  searchResults,
}: {
  requestItems: UnallowedValueRequestItem[];
  searchResults: UnallowedValueSearchResult[] | null;
}): Record<string, UnallowedValueCount[]> => {
  if (searchResults == null || !Array.isArray(searchResults)) {
    return {};
  }

  return requestItems.reduce((acc, { indexFieldName }) => {
    const searchResult = searchResults.find(
      (x) =>
        typeof x.aggregations === 'object' && Array.isArray(x.aggregations[indexFieldName]?.buckets)
    );

    if (
      searchResult != null &&
      searchResult.aggregations != null &&
      searchResult.aggregations[indexFieldName] != null
    ) {
      const buckets = searchResult.aggregations[indexFieldName]?.buckets;

      return {
        ...acc,
        [indexFieldName]: buckets?.flatMap((x) => (isBucket(x) ? getUnallowedValueCount(x) : [])),
      };
    } else {
      return {
        ...acc,
        [indexFieldName]: [],
      };
    }
  }, {});
};

const UNALLOWED_VALUES_API_ROUTE = '/internal/ecs_data_quality_dashboard/unallowed_field_values';
export async function fetchUnallowedValues({
  abortController,
  httpFetch,
  indexName,
  requestItems,
}: {
  abortController: AbortController;
  httpFetch: HttpHandler;
  indexName: string;
  requestItems: UnallowedValueRequestItem[];
}): Promise<UnallowedValueSearchResult[]> {
  try {
    return await httpFetch<UnallowedValueSearchResult[]>(UNALLOWED_VALUES_API_ROUTE, {
      body: JSON.stringify(requestItems),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      signal: abortController.signal,
      version: INTERNAL_API_VERSION,
    });
  } catch (e) {
    throw new UnallowedValuesError(indexName, e.message);
  }
}

export class UnallowedValuesError extends Error {
  constructor(indexName: string, details: string) {
    const message = i18n.ERROR_LOADING_UNALLOWED_VALUES({ details, indexName });
    super(message);

    this.name = 'UnallowedValuesError';
    this.message = message;
  }
}
