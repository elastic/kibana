/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesGetMappingIndexMappingRecord } from '@elastic/elasticsearch/lib/api/types';
import { useEffect, useState } from 'react';

import * as i18n from '../translations';

import { fetchMappings } from './helpers';

interface UseMappings {
  indexes: Record<string, IndicesGetMappingIndexMappingRecord> | null;
  error: string | null;
  loading: boolean;
}

export const useMappings = (patternOrIndexName: string): UseMappings => {
  const [indexes, setIndexes] = useState<Record<
    string,
    IndicesGetMappingIndexMappingRecord
  > | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const abortController = new AbortController();

    async function fetchData() {
      try {
        setIndexes(await fetchMappings({ abortController, patternOrIndexName }));
      } catch (e) {
        if (!abortController.signal.aborted) {
          setError(i18n.ERROR_LOADING_MAPPINGS({ details: e, patternOrIndexName }));
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
  }, [patternOrIndexName, setError]);

  return { indexes, error, loading };
};
