/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { useDataQualityContext } from '../data_quality_panel/data_quality_context';
import { fixIndicesMappings } from './helpers';

export const useFixIndicesMappings = () => {
  const { httpFetch } = useDataQualityContext();
  const [result, setResult] = useState<unknown[] | null>(null);
  const [error, setError] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const fixMappings = useCallback(
    async ({
      abortController,
      body,
      toasts,
    }: {
      abortController?: AbortController;
      body: {
        indexName: string;
        indexTemplate: string;
        expectedMappings: Record<string, string>;
      };
      toasts?: IToasts;
    }) => {
      try {
        setLoading(true);
        const { errors, result } = await fixIndicesMappings({
          abortController,
          httpFetch,
          body,
        });

        if (!abortController?.signal.aborted && !errors) {
          setError(errors);
          setResult(result);
          toasts?.addSuccess({
            title: `Fixing`,
            text: `Task id: ${result.taskId}, target index: ${result.targetIndex}`,
          });
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

  return { error, result, loading, fixIndicesMapping: fixMappings };
};
