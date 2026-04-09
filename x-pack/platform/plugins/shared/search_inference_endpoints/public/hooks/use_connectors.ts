/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import type { InferenceConnector } from '@kbn/inference-common';
import type { InferenceConnectorsResponse } from '../../common/types';
import { useKibana } from './use_kibana';

const INFERENCE_CONNECTORS_API = '/internal/inference/connectors';

export interface UseConnectorsResult {
  connectors?: InferenceConnector[];
  loading: boolean;
  error?: Error;
  reload: () => void;
}

export const useConnectors = (): UseConnectorsResult => {
  const { services } = useKibana();
  const { http } = services;

  const [connectors, setConnectors] = useState<InferenceConnector[] | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  const fetchConnectors = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(undefined);
      try {
        const res = await http.get<InferenceConnectorsResponse>(INFERENCE_CONNECTORS_API, {
          signal,
        });
        setConnectors(res.connectors);
      } catch (e) {
        if ((e as any)?.name !== 'AbortError') {
          setError(e as Error);
          setConnectors(undefined);
        }
      } finally {
        setLoading(false);
      }
    },
    [http]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchConnectors(controller.signal);
    return () => controller.abort();
  }, [fetchConnectors]);

  return {
    connectors,
    loading,
    error,
    reload: () => fetchConnectors(),
  };
};
