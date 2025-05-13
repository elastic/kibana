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
import { useKibana } from './use_kibana';
import { isInferenceEndpointExists } from './inference_endpoint_exists';

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
  const {
    services: { http },
  } = useKibana();

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
        return results
          .reduce<Promise<FindActionResult[]>>(async (result, connector) => {
            if (
              connector.actionTypeId !== '.inference' ||
              (connector.actionTypeId === '.inference' &&
                (await isInferenceEndpointExists(
                  http,
                  (connector as FindActionResult)?.config?.inferenceId
                )))
            ) {
              return [...(await result), connector];
            }

            return result;
          }, Promise.resolve([]))
          .then((c) => {
            setConnectors(c);
            setSelectedConnector((connectorId) => {
              if (connectorId && c.findIndex((result) => result.id === connectorId) === -1) {
                return '';
              }
              return connectorId;
            });

            setError(undefined);
          });
      })
      .catch((err) => {
        setError(err);
        setConnectors(undefined);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [assistant, controller.signal, http, setSelectedConnector]);

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
