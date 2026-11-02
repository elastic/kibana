/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import type { InferenceConnector, InferenceConnectorType } from '@kbn/inference-common';
import { useLoadConnectors, type AIConnector } from '@kbn/inference-connectors';
import { STREAMS_INFERENCE_PARENT_FEATURE_ID } from '@kbn/streams-schema';

const STREAMS_CONNECTOR_STORAGE_KEY = 'xpack.streamsApp.lastUsedConnector';
const OLD_STORAGE_KEY = 'xpack.observabilityAiAssistant.lastUsedConnector';

export interface UseGenAIConnectorsResult {
  connectors: InferenceConnector[] | undefined;
  selectedConnector: string | undefined;
  loading: boolean;
  error: Error | undefined;
  selectConnector: (id: string) => void;
  reloadConnectors: () => Promise<void>;
  isConnectorSelectionRestricted: boolean;
}

const toInferenceConnector = (c: AIConnector): InferenceConnector => ({
  connectorId: c.id,
  name: c.name,
  type: c.actionTypeId as InferenceConnectorType,
  config: 'config' in c ? (c.config as Record<string, unknown>) : {},
  capabilities: {},
  isPreconfigured: c.isPreconfigured,
  isInferenceEndpoint: false,
  isEis: c.isEis,
  isDeprecated: c.isDeprecated,
  isMissingSecrets: c.isMissingSecrets,
});

export function useGenAIConnectors({
  http,
  settings,
}: {
  http: HttpSetup;
  settings: SettingsStart;
}): UseGenAIConnectorsResult {
  const {
    data: aiConnectors,
    isLoading,
    error: queryError,
    refetch,
    soEntryFound,
  } = useLoadConnectors({
    http,
    featureId: STREAMS_INFERENCE_PARENT_FEATURE_ID,
    settings,
  });

  const connectors = useMemo(() => aiConnectors?.map(toInferenceConnector), [aiConnectors]);

  const isConnectorSelectionRestricted = soEntryFound;

  const [oldConnector] = useLocalStorage<string>(OLD_STORAGE_KEY);
  const [lastUsedConnector, setLastUsedConnector] = useLocalStorage<string | undefined>(
    STREAMS_CONNECTOR_STORAGE_KEY,
    oldConnector
  );

  const selectedConnector = useMemo(() => {
    const ids = connectors?.map((c) => c.connectorId);
    if (lastUsedConnector && ids?.includes(lastUsedConnector)) {
      return lastUsedConnector;
    }
    return connectors?.[0]?.connectorId;
  }, [lastUsedConnector, connectors]);

  const selectConnector = useCallback(
    (id: string) => {
      setLastUsedConnector(id);
    },
    [setLastUsedConnector]
  );

  const reloadConnectors = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    connectors,
    selectedConnector,
    loading: isLoading,
    error: queryError ?? undefined,
    selectConnector,
    reloadConnectors,
    isConnectorSelectionRestricted,
  };
}
