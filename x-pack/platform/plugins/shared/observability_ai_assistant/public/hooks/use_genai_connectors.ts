/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FindActionResult } from '@kbn/actions-plugin/server';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';
import type { ObservabilityAIAssistantService } from '../types';
import { useObservabilityAIAssistant } from './use_observability_ai_assistant';
import { useKibana } from './use_kibana';
import { isInferenceEndpointExists } from './inference_endpoint_exists';
import { INFERENCE_CONNECTOR_ACTION_TYPE_ID } from '../utils/get_elastic_managed_llm_connector';
import {
  type InferenceConnector,
  getInferenceConnectorInfo,
} from '../../common/utils/get_inference_connector';

// TODO: Import from gen-ai-settings-plugin (package) once available
const NO_DEFAULT_CONNECTOR = 'NO_DEFAULT_CONNECTOR';

export interface UseGenAIConnectorsResult {
  connectors?: FindActionResult[];
  selectedConnector?: string;
  loading: boolean;
  error?: Error;
  selectConnector: (id: string) => void;
  reloadConnectors: () => void;
  getConnector: (id: string) => InferenceConnector | undefined;
  isConnectorSelectionRestricted: boolean;
  defaultConnector?: string;
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
    services: { http, uiSettings },
  } = useKibana();

  const defaultConnector = uiSettings!.get<string>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR);

  const genAISettingsDefaultOnly = uiSettings!.get<boolean>(
    GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
    false
  );

  const isConnectorSelectionRestricted =
    genAISettingsDefaultOnly && defaultConnector !== NO_DEFAULT_CONNECTOR;

  const [lastUsedConnector, setLastUsedConnector] = useLocalStorage(
    `xpack.observabilityAiAssistant.lastUsedConnector`,
    ''
  );

  const selectedConnector = useMemo(() => {
    if (isConnectorSelectionRestricted) {
      return defaultConnector;
    }
    if (lastUsedConnector) {
      return lastUsedConnector;
    }
    if (defaultConnector !== NO_DEFAULT_CONNECTOR) {
      return defaultConnector;
    }
    return undefined;
  }, [isConnectorSelectionRestricted, defaultConnector, lastUsedConnector]);

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
              connector.actionTypeId !== INFERENCE_CONNECTOR_ACTION_TYPE_ID ||
              (connector.actionTypeId === INFERENCE_CONNECTOR_ACTION_TYPE_ID &&
                (await isInferenceEndpointExists(
                  http,
                  (connector as FindActionResult)?.config?.inferenceId
                )))
            ) {
              return [...(await result), connector];
            }

            return result;
          }, Promise.resolve([]))
          .then((_connectors) => {
            if (isConnectorSelectionRestricted) {
              const defaultC = _connectors.find((con) => con.id === defaultConnector);
              _connectors = defaultC ? [defaultC] : [];
            }
            setConnectors(_connectors);
            setLastUsedConnector((connectorId) => {
              if (
                connectorId &&
                _connectors.findIndex((result) => result.id === connectorId) === -1
              ) {
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
  }, [
    assistant,
    controller.signal,
    http,
    setLastUsedConnector,
    isConnectorSelectionRestricted,
    defaultConnector,
  ]);

  useEffect(() => {
    fetchConnectors();

    return () => {
      controller.abort();
    };
  }, [assistant, controller, fetchConnectors, setLastUsedConnector]);

  const getConnector = (id: string) => {
    const connector = connectors?.find((_connector) => _connector.id === id);
    return getInferenceConnectorInfo(connector);
  };

  return {
    connectors,
    loading,
    error,
    selectedConnector: selectedConnector || connectors?.[0]?.id,
    selectConnector: (id: string) => {
      setLastUsedConnector(id);
    },
    reloadConnectors: () => {
      fetchConnectors();
    },
    getConnector,
    isConnectorSelectionRestricted,
    defaultConnector: defaultConnector === NO_DEFAULT_CONNECTOR ? undefined : defaultConnector,
  };
}
