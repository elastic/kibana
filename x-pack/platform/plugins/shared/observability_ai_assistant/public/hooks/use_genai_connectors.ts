/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import {
  connectorToInference,
  type InferenceConnector as CommonInferenceConnector,
} from '@kbn/inference-common';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useLoadConnectors } from '@kbn/inference-connectors';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';
import type { ObservabilityAIAssistantService } from '../types';
import { useObservabilityAIAssistant } from './use_observability_ai_assistant';
import { useKibana } from './use_kibana';
import {
  type InferenceConnector,
  getInferenceConnectorInfo,
} from '../../common/utils/get_inference_connector';
import { OBSERVABILITY_AI_ASSISTANT_SUBFEATURE_ID } from '../../common/feature';

const NO_DEFAULT_CONNECTOR = 'NO_DEFAULT_CONNECTOR';

export interface UseGenAIConnectorsResult {
  connectors?: CommonInferenceConnector[];
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
  _assistant: ObservabilityAIAssistantService
): UseGenAIConnectorsResult {
  const {
    services: { uiSettings, http, settings, notifications },
  } = useKibana();

  const defaultConnector = uiSettings!.get<string>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR);

  const genAISettingsDefaultOnly = uiSettings!.get<boolean>(
    GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
    false
  );

  const isConnectorSelectionRestricted =
    genAISettingsDefaultOnly && defaultConnector !== NO_DEFAULT_CONNECTOR;

  const {
    data: aiConnectors,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useLoadConnectors({
    http: http!,
    featureId: OBSERVABILITY_AI_ASSISTANT_SUBFEATURE_ID,
    settings: settings!,
    toasts: notifications?.toasts,
  });

  const connectors = useMemo(
    () => aiConnectors?.map((c) => connectorToInference(c)),
    [aiConnectors]
  );

  const error = queryError ? (queryError as unknown as Error) : undefined;

  const [lastUsedConnector, setLastUsedConnector] = useLocalStorage(
    `xpack.observabilityAiAssistant.lastUsedConnector`,
    ''
  );

  useEffect(() => {
    if (connectors) {
      setLastUsedConnector((connectorId) => {
        if (
          connectorId &&
          connectors.findIndex((result) => result.connectorId === connectorId) === -1
        ) {
          return '';
        }
        return connectorId;
      });
    }
  }, [connectors, setLastUsedConnector]);

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

  const getConnector = (id: string) => {
    const connector = connectors?.find((_connector) => _connector.connectorId === id);
    return getInferenceConnectorInfo(connector);
  };

  return {
    connectors,
    loading,
    error,
    selectedConnector: selectedConnector || connectors?.[0]?.connectorId,
    selectConnector: (id: string) => {
      setLastUsedConnector(id);
    },
    reloadConnectors: () => {
      refetch();
    },
    getConnector,
    isConnectorSelectionRestricted,
    defaultConnector: defaultConnector === NO_DEFAULT_CONNECTOR ? undefined : defaultConnector,
  };
}
