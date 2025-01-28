/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FindActionResult } from '@kbn/actions-plugin/server';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { ObservabilityAIAssistantService } from '../types';
import { useObservabilityAIAssistant } from './use_observability_ai_assistant';

export interface UseGenAIConnectorsResult {
  connectors?: FindActionResult[];
  selectedConnector?: string;
  loading: boolean;
  error?: Error;
  selectConnector: (id: string) => void;
  reloadConnectors: () => void;
}

export function useGenAIConnectors(): UseGenAIConnectorsResult {
  const assistant = useObservabilityAIAssistant();

  return useGenAIConnectorsWithoutContext(assistant);
}

export function useGenAIConnectorsWithoutContext(
  assistant: ObservabilityAIAssistantService
): UseGenAIConnectorsResult {
  const [connectors, setConnectors] = useState<FindActionResult[] | undefined>(undefined);

  const [selectedConnector, setSelectedConnector] = useLocalStorage(
    `xpack.observabilityAiAssistant.lastUsedConnector`,
    ''
  );

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<Error | undefined>(undefined);

  const controller = useMemo(() => new AbortController(), []);
  const fetchConnectors = useCallback(async () => {
    setLoading(true);

    assistant
      .callApi('GET /internal/observability_ai_assistant/connectors', {
        signal: controller.signal,
      })
      .then((results) => {
        setConnectors(results);
        setSelectedConnector((connectorId) => {
          if (connectorId && results.findIndex((result) => result.id === connectorId) === -1) {
            return '';
          }
          return connectorId;
        });

        setError(undefined);
      })
      .catch((err) => {
        setError(err);
        setConnectors(undefined);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [assistant, controller.signal, setSelectedConnector]);

  useEffect(() => {
    fetchConnectors();

    return () => {
      controller.abort();
    };
  }, [assistant, controller, fetchConnectors, setSelectedConnector]);

  return {
    connectors,
    loading,
    error,
    selectedConnector: selectedConnector || connectors?.[0]?.id,
    selectConnector: (id: string) => {
      setSelectedConnector(id);
    },
    reloadConnectors: () => {
      fetchConnectors();
    },
  };
}
