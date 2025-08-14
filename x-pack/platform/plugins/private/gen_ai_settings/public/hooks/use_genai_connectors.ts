/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import type { FindActionResult } from '@kbn/actions-plugin/server';
import { useKibana } from './use_kibana';

export interface UseGenAiConnectorsResult {
  connectors?: FindActionResult[];
  loading: boolean;
  error?: Error;
  reload: () => void;
}

export function useGenAiConnectors(): UseGenAiConnectorsResult {
  const {
    services: { genAiSettingsApi },
  } = useKibana();

  const [connectors, setConnectors] = useState<FindActionResult[] | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  const fetchConnectors = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(undefined);
      try {
        const res = await genAiSettingsApi('GET /internal/gen_ai_settings/connectors', {
          signal: signal ?? null,
        });
        setConnectors(res);
      } catch (e) {
        // Ignore aborts
        if ((e as any)?.name !== 'AbortError') {
          setError(e as Error);
          setConnectors(undefined);
        }
      } finally {
        setLoading(false);
      }
    },
    [genAiSettingsApi]
  );

  useEffect(
    function fetchGenAiConnectors() {
      const controller = new AbortController();
      fetchConnectors(controller.signal);
      return () => controller.abort();
    },
    [fetchConnectors]
  );

  return {
    connectors,
    loading,
    error,
    reload: () => {
      fetchConnectors();
    },
  };
}
