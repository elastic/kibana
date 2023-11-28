/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesGetMappingIndexMappingRecord } from '@elastic/elasticsearch/lib/api/types';
import { useEffect, useState } from 'react';

import { useDataQualityContext } from '../data_quality_panel/data_quality_context';
import { fetchMappings } from './helpers';

export interface UseMappings {
  indexes: Record<string, IndicesGetMappingIndexMappingRecord> | null;
  error: string | null;
  loading: boolean;
}

export const useMappings = (patternOrIndexName: string): UseMappings => {
  const [indexes, setIndexes] = useState<Record<
    string,
    IndicesGetMappingIndexMappingRecord
  > | null>(null);
  const { httpFetch } = useDataQualityContext();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const abortController = new AbortController();

    async function fetchData() {
      try {
        const response = await fetchMappings({ abortController, httpFetch, patternOrIndexName });

        if (!abortController.signal.aborted) {
          setIndexes(response);
        }
      } catch (e) {
        if (!abortController.signal.aborted) {
          setError(e.message);
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
  }, [httpFetch, patternOrIndexName, setError]);

  return { indexes, error, loading };
};
