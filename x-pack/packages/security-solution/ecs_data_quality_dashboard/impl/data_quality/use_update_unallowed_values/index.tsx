/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useDataQualityContext } from '../data_quality_panel/data_quality_context';
import { updateUnallowedValues } from './helpers';

export const useUpdateUnallowedValues = (
  requestItems: Array<{
    id: string;
    indexFieldName: string;
    indexName: string;
    value: string;
  }>
) => {
  const { httpFetch } = useDataQualityContext();
  const [result, setResult] = useState<unknown[] | null>(null);
  const [error, setError] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (requestItems.length === 0) {
      return;
    }
    setLoading(true);

    const abortController = new AbortController();

    async function fetchData() {
      try {
        const { errors, items } = await updateUnallowedValues({
          abortController,
          httpFetch,
          body: requestItems,
        });

        if (!abortController.signal.aborted && errors) {
          setError(errors);
          setResult(items);
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
  }, [httpFetch, requestItems, setError]);

  return { error, result, loading };
};
