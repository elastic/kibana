/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import type { InferenceConnector as CommonInferenceConnector } from '@kbn/inference-common';
import { InferenceConnectorType } from '@kbn/inference-common';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useLoadConnectors, type AIConnector } from '@kbn/inference-connectors';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';
import { OBSERVABILITY_AI_ASSISTANT_SUBFEATURE_ID } from '../../common/feature';
import { useKibana } from './use_kibana';
import {
  type InferenceConnector,
  getInferenceConnectorInfo,
} from '../../common/utils/get_inference_connector';

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

const toInferenceConnector = (connector: AIConnector): CommonInferenceConnector => ({
  connectorId: connector.id,
  name: connector.name,
  type: connector.actionTypeId as InferenceConnectorType,
  config: 'config' in connector ? connector.config ?? {} : {},
  capabilities: {},
  isInferenceEndpoint: connector.actionTypeId === InferenceConnectorType.Inference,
  isPreconfigured: connector.isPreconfigured,
  isEis: connector.isEis,
  isDeprecated: connector.isDeprecated,
  isConnectorTypeDeprecated: connector.isConnectorTypeDeprecated,
  isMissingSecrets: connector.isMissingSecrets,
});

export function useGenAIConnectors(): UseGenAIConnectorsResult {
  return useGenAIConnectorsWithoutContext();
}

export function useGenAIConnectorsWithoutContext(_assistant?: unknown): UseGenAIConnectorsResult {
  const {
    services: { http, settings, notifications, uiSettings },
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

  const {
    data: aiConnectors,
    isLoading: loading,
    error,
    refetch,
  } = useLoadConnectors({
    http: http!,
    toasts: notifications?.toasts,
    featureId: OBSERVABILITY_AI_ASSISTANT_SUBFEATURE_ID,
    settings: settings!,
  });

  const connectors = useMemo(() => aiConnectors?.map(toInferenceConnector), [aiConnectors]);

  useEffect(() => {
    if (connectors) {
      setLastUsedConnector((connectorId) => {
        if (connectorId && connectors.findIndex((c) => c.connectorId === connectorId) === -1) {
          return '';
        }
        return connectorId;
      });
    }
  }, [connectors, setLastUsedConnector]);

  const selectedConnector = useMemo(() => {
    const hasConnector = (id: string | undefined) =>
      id && connectors?.some((c) => c.connectorId === id);

    if (hasConnector(lastUsedConnector)) {
      return lastUsedConnector;
    }
    return connectors?.[0]?.connectorId;
  }, [lastUsedConnector, connectors]);

  const getConnector = (id: string) => {
    const connector = connectors?.find((_connector) => _connector.connectorId === id);
    return getInferenceConnectorInfo(connector);
  };

  return {
    connectors,
    loading,
    error: error ?? undefined,
    selectedConnector,
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
