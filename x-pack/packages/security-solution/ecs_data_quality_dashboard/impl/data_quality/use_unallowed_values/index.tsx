/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';

import { useDataQualityContext } from '../data_quality_panel/data_quality_context';
import { fetchUnallowedValues, getUnallowedValues } from './helpers';
import type { UnallowedValueCount, UnallowedValueRequestItem, UnallowedValueDoc } from '../types';

export interface UseUnallowedValues {
  unallowedValues: Record<string, UnallowedValueCount[]> | null;
  unallowedValuesDocs: Record<string, UnallowedValueDoc[]> | null;
  error: string | null;
  loading: boolean;
  refetchUnallowedValue: (abortController?: AbortController | undefined) => Promise<void>;
}

export const useUnallowedValues = ({
  indexName,
  requestItems,
}: {
  indexName: string;
  requestItems: UnallowedValueRequestItem[];
}): UseUnallowedValues => {
  const [unallowedValues, setUnallowedValues] = useState<Record<
    string,
    UnallowedValueCount[]
  > | null>(null);
  const [unallowedValuesDocs, setUnallowedValuesDocs] = useState<Record<
    string,
    UnallowedValueDoc[]
  > | null>(null);

  const { httpFetch } = useDataQualityContext();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const fetchData = useCallback(
    async (abortController?: AbortController) => {
      try {
        const searchResults = await fetchUnallowedValues({
          abortController,
          httpFetch,
          indexName,
          requestItems,
        });

        const { buckets: unallowedValuesMap, docs: unallowedValuesDocuments } = getUnallowedValues({
          requestItems,
          searchResults,
        });

        if (!abortController?.signal.aborted) {
          setUnallowedValues(unallowedValuesMap);
          setUnallowedValuesDocs(unallowedValuesDocuments);
        }
      } catch (e) {
        if (!abortController?.signal.aborted) {
          setError(e.message);
        }
      } finally {
        if (!abortController?.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [httpFetch, indexName, requestItems]
  );
  useEffect(() => {
    if (requestItems.length === 0) {
      return;
    }

    const abortController = new AbortController();

    fetchData(abortController);

    return () => {
      abortController.abort();
    };
  }, [fetchData, httpFetch, indexName, requestItems, setError]);

  return { unallowedValues, unallowedValuesDocs, error, loading, refetchUnallowedValue: fetchData };
};
