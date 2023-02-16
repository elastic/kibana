/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import { fetchUnallowedValues, getUnallowedValues } from './helpers';
import type { UnallowedValueCount, UnallowedValueRequestItem } from '../types';

interface UseUnallowedValues {
  unallowedValues: Record<string, UnallowedValueCount[]> | null;
  error: string | null;
  loading: boolean;
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (requestItems.length === 0) {
      return;
    }

    const abortController = new AbortController();

    async function fetchData() {
      try {
        // if (indexName === '.ds-logs-endpoint.alerts-default-2023.01.17-000001') {
        //   throw new Error(
        //     'simulated useUnallowedValues failure just for .ds-logs-endpoint.alerts-default-2023.01.17-000001'
        //   );
        // }

        const searchResults = await fetchUnallowedValues({
          abortController,
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
          setError(e);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      abortController.abort();
    };
  }, [indexName, requestItems, setError]);

  return { unallowedValues, error, loading };
};
