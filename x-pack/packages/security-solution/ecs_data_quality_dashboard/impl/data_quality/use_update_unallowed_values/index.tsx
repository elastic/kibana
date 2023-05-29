/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { useDataQualityContext } from '../data_quality_panel/data_quality_context';
import { updateUnallowedValues } from './helpers';

export const useUpdateUnallowedValues = () => {
  const { httpFetch } = useDataQualityContext();
  const [result, setResult] = useState<unknown[] | null>(null);
  const [error, setError] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const updateData = useCallback(
    async ({
      abortController,
      requestItems,
    }: {
      abortController?: AbortController;
      requestItems: Array<{
        id: string;
        indexFieldName: string;
        indexName: string;
        value: string;
      }>;
    }) => {
      try {
        if (requestItems.length === 0) {
          return;
        }
        setLoading(true);
        const { errors, items } = await updateUnallowedValues({
          abortController,
          httpFetch,
          body: requestItems,
        });

        if (!abortController?.signal.aborted && errors) {
          setError(errors);
          setResult(items);
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
    [httpFetch]
  );

  return { error, result, loading, updateUnallowedValue: updateData };
};
