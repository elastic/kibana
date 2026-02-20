/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';

const STREAMS_CONNECTOR_STORAGE_KEY = 'xpack.streamsApp.lastUsedConnector';
const OLD_STORAGE_KEY = 'xpack.observabilityAiAssistant.lastUsedConnector';
// TODO: Import from gen-ai-settings-plugin (package) once available
const NO_DEFAULT_CONNECTOR = 'NO_DEFAULT_CONNECTOR';

export interface Connector {
  id: string;
  name: string;
  actionTypeId: string;
  config?: Record<string, unknown>;
  isPreconfigured?: boolean;
  isDeprecated?: boolean;
  isSystemAction?: boolean;
  isMissingSecrets?: boolean;
  referencedByCount?: number;
}

export interface UseGenAIConnectorsResult {
  connectors: Connector[] | undefined;
  selectedConnector: string | undefined;
  loading: boolean;
  error: Error | undefined;
  selectConnector: (id: string) => void;
  reloadConnectors: () => Promise<void>;
  isConnectorSelectionRestricted: boolean;
  defaultConnector: string | undefined;
}

export function useGenAIConnectors({
  streamsRepositoryClient,
  uiSettings,
}: {
  streamsRepositoryClient: StreamsRepositoryClient;
  uiSettings: IUiSettingsClient;
}): UseGenAIConnectorsResult {
  const [connectors, setConnectors] = useState<Connector[] | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();

  // Read settings
  const defaultConnector = uiSettings.get<string>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR);
  const genAISettingsDefaultOnly = uiSettings.get<boolean>(
    GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
    false
  );

  const isConnectorSelectionRestricted =
    genAISettingsDefaultOnly && defaultConnector !== NO_DEFAULT_CONNECTOR;

  // Read old localStorage key (for backward compatibility, don't modify it)
  const [oldConnector] = useLocalStorage<string>(OLD_STORAGE_KEY);

  // Use old connector as initial value for new key (only if new key doesn't exist yet)
  const [lastUsedConnector, setLastUsedConnector] = useLocalStorage<string | undefined>(
    STREAMS_CONNECTOR_STORAGE_KEY,
    oldConnector
  );

  const fetchConnectors = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      const controller = new AbortController();
      const response = await streamsRepositoryClient.fetch('GET /internal/streams/connectors', {
        signal: controller.signal,
      });
      let results = response.connectors;

      // If connector selection is restricted, only return the default connector
      if (isConnectorSelectionRestricted) {
        const defaultC = results.find((con) => con.id === defaultConnector);
        results = defaultC ? [defaultC] : [];
      }

      setConnectors(results);

      // Clear lastUsedConnector if it's no longer in the list
      setLastUsedConnector((connectorId) => {
        if (connectorId && results.findIndex((result) => result.id === connectorId) === -1) {
          return undefined;
        }
        return connectorId;
      });
    } catch (err) {
      setError(err as Error);
      setConnectors(undefined);
    } finally {
      setLoading(false);
    }
  }, [
    streamsRepositoryClient,
    isConnectorSelectionRestricted,
    defaultConnector,
    setLastUsedConnector,
  ]);

  useEffect(() => {
    fetchConnectors();
  }, [fetchConnectors]);

  // Determine selected connector (follows observability pattern)
  const selectedConnector = useMemo(() => {
    // If restricted, always use default
    if (isConnectorSelectionRestricted) {
      return defaultConnector;
    }

    // Priority 1: User's explicit choice (localStorage)
    if (lastUsedConnector) {
      return lastUsedConnector;
    }

    // Priority 2: Global AI default setting
    if (defaultConnector !== NO_DEFAULT_CONNECTOR) {
      return defaultConnector;
    }

    return undefined;
  }, [isConnectorSelectionRestricted, defaultConnector, lastUsedConnector]);

  const selectConnector = useCallback(
    (id: string) => {
      setLastUsedConnector(id);
    },
    [setLastUsedConnector]
  );

  const reloadConnectors = useCallback(async () => {
    await fetchConnectors();
  }, [fetchConnectors]);

  // If the selected connector is no longer available, select the first available connector
  useEffect(() => {
    const availableConnectors = connectors?.map((connector) => connector.id);

    if (
      selectedConnector &&
      availableConnectors &&
      !availableConnectors.includes(selectedConnector)
    ) {
      setLastUsedConnector(availableConnectors[0]); // First or undefined if empty
    }
  }, [connectors, setLastUsedConnector, selectedConnector]);

  return {
    connectors,
    selectedConnector: selectedConnector || connectors?.[0]?.id,
    loading,
    error,
    selectConnector,
    reloadConnectors,
    isConnectorSelectionRestricted,
    defaultConnector: defaultConnector === NO_DEFAULT_CONNECTOR ? undefined : defaultConnector,
  };
}
