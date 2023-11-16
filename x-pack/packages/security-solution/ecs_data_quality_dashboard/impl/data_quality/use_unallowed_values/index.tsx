/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import { useDataQualityContext } from '../data_quality_panel/data_quality_context';
import { fetchUnallowedValues, getUnallowedValues } from './helpers';
import type { UnallowedValueCount, UnallowedValueRequestItem } from '../types';

export interface UseUnallowedValues {
  unallowedValues: Record<string, UnallowedValueCount[]> | null;
  error: string | null;
  loading: boolean;
  requestTime: number | undefined;
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
  const { httpFetch } = useDataQualityContext();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [requestTime, setRequestTime] = useState<number>();
  useEffect(() => {
    if (requestItems.length === 0) {
      return;
    }

    const abortController = new AbortController();

    async function fetchData() {
      const startTime = Date.now();

      try {
        const searchResults = await fetchUnallowedValues({
          abortController,
          httpFetch,
          indexName,
          requestItems,
        });

        const unallowedValuesMap = getUnallowedValues({
          requestItems,
          searchResults,
        });

        if (!abortController.signal.aborted) {
          setUnallowedValues(unallowedValuesMap);
        }
      } catch (e) {
        if (!abortController.signal.aborted) {
          setError(e.message);
          setRequestTime(Date.now() - startTime);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
          setRequestTime(Date.now() - startTime);
        }
      }
    }

    fetchData();

    return () => {
      abortController.abort();
    };
  }, [httpFetch, indexName, requestItems, setError]);

  return { unallowedValues, error, loading, requestTime };
};
