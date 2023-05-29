/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core-http-browser';
import * as i18n from '../translations';
import type {
  Bucket,
  UnallowedValueCount,
  UnallowedValueRequestItem,
  UnallowedValueSearchResult,
  UnallowedValueDoc,
} from '../types';

const UNALLOWED_VALUES_API_ROUTE = '/internal/ecs_data_quality_dashboard/unallowed_field_values';

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
}): {
  buckets: Record<string, UnallowedValueCount[]>;
  docs: Record<string, UnallowedValueDoc[]>;
} => {
  if (searchResults == null || !Array.isArray(searchResults)) {
    return { buckets: {}, docs: {} };
  }

  return requestItems.reduce(
    (acc, { indexFieldName }) => {
      const searchResult = searchResults.find(
        (x) =>
          typeof x.aggregations === 'object' &&
          Array.isArray(x.aggregations[indexFieldName]?.buckets)
      );

      if (
        searchResult != null &&
        searchResult.aggregations != null &&
        searchResult.aggregations[indexFieldName] != null
      ) {
        const buckets = searchResult.aggregations[indexFieldName]?.buckets;
        const docs = searchResult?.hits?.hits ?? [];

        return {
          buckets: {
            ...acc.buckets,
            [indexFieldName]: buckets?.flatMap((x) =>
              isBucket(x) ? getUnallowedValueCount(x) : []
            ),
          },
          docs: {
            ...acc.docs,
            [indexFieldName]: docs,
          },
        };
      } else {
        return {
          buckets: {
            ...acc.buckets,
            [indexFieldName]: [],
          },
          docs: {
            ...acc.docs,
            [indexFieldName]: [],
          },
        };
      }
    },
    { buckets: {}, docs: {} }
  );
};

export async function fetchUnallowedValues({
  abortController,
  httpFetch,
  indexName,
  requestItems,
}: {
  abortController?: AbortController;
  httpFetch: HttpHandler;
  indexName: string;
  requestItems: UnallowedValueRequestItem[];
}): Promise<UnallowedValueSearchResult[]> {
  try {
    return await httpFetch<UnallowedValueSearchResult[]>(UNALLOWED_VALUES_API_ROUTE, {
      body: JSON.stringify(requestItems),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      signal: abortController?.signal,
    });
  } catch (e) {
    throw new Error(
      i18n.ERROR_LOADING_UNALLOWED_VALUES({
        details: e.message,
        indexName,
      })
    );
  }
}
