/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useState } from 'react';
import { IToasts } from '@kbn/core-notifications-browser';
import { HttpHandler } from '@kbn/core-http-browser';
import { isEmpty } from 'lodash/fp';

import { DataQualityCheckResult } from '../../../../types';
import { formatResultFromStorage, getStorageResults } from '../../utils/storage';

export const useStoredPatternResults = (
  patterns: string[],
  toasts: IToasts,
  httpFetch: HttpHandler
) => {
  const [storedPatternResults, setStoredPatternResults] = useState<
    Array<{ pattern: string; results: Record<string, DataQualityCheckResult> }>
  >([]);

  useEffect(() => {
    if (isEmpty(patterns)) {
      return;
    }

    const abortController = new AbortController();
    const fetchStoredPatternResults = async () => {
      const requests = patterns.map((pattern) =>
        getStorageResults({ pattern, httpFetch, abortController, toasts }).then((results = []) => ({
          pattern,
          results: Object.fromEntries(
            results.map((storageResult) => [
              storageResult.indexName,
              formatResultFromStorage({ storageResult, pattern }),
            ])
          ),
        }))
      );

      const patternResults = await Promise.all(requests);
      if (patternResults?.length) {
        setStoredPatternResults(patternResults);
      }
    };

    fetchStoredPatternResults();
  }, [httpFetch, patterns, toasts]);

  return storedPatternResults;
};
