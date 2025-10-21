/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { InferenceConnector } from '@kbn/inference-common';
import useLocalStorage from 'react-use/lib/useLocalStorage';

import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';
import { useKibana } from './use_kibana';
import { storageKeys } from '../storage_keys';

const NO_DEFAULT_CONNECTOR = 'NO_DEFAULT_CONNECTOR'; // TODO: Import from gen-ai-settings-plugin (package) once available

export interface UseConnectorSelectionResult {
  connectors: InferenceConnector[];
  defaultConnector?: string;
  selectedConnector?: string;
  selectConnector: (connectorId: string) => void;
  isLoading: boolean;
  error: Error | null;
  reloadConnectors: () => void;
}

export function useConnectorSelection(): UseConnectorSelectionResult {
  const {
    services: {
      plugins: { inference },
      uiSettings,
    },
  } = useKibana();

  const [connectors, setConnectors] = useState<InferenceConnector[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [userSelectedConnector, setUserSelectedConnector] = useState<string | null>(null);

  const [lastUsedConnector, setLastUsedConnector] = useLocalStorage<string>(
    storageKeys.lastUsedConnector
  );

  const defaultConnector = uiSettings?.get<string>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR);
  const defaultConnectorOnly = uiSettings?.get<boolean>(
    GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
    false
  );

  const isConnectorSelectionRestricted =
    defaultConnectorOnly && defaultConnector !== NO_DEFAULT_CONNECTOR;

  const selectedConnector = useMemo(() => {
    // If admin restricted to default only, always use default
    if (isConnectorSelectionRestricted) {
      return defaultConnector;
    }

    // If user just selected a connector in this session, use it
    if (userSelectedConnector && connectors.some((c) => c.connectorId === userSelectedConnector)) {
      return userSelectedConnector;
    }

    // Check localStorage first
    if (lastUsedConnector && connectors.some((c) => c.connectorId === lastUsedConnector)) {
      return lastUsedConnector;
    }

    // Fall back to default connector if set
    if (defaultConnector && defaultConnector !== NO_DEFAULT_CONNECTOR) {
      return defaultConnector;
    }

    // Finally, use first available connector
    return connectors[0]?.connectorId;
  }, [
    isConnectorSelectionRestricted,
    defaultConnector,
    connectors,
    userSelectedConnector,
    lastUsedConnector,
  ]);

  // Load connectors
  const loadConnectors = useCallback(async () => {
    if (!inference) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let fetchedConnectors = await inference.getConnectors();

      if (isConnectorSelectionRestricted && defaultConnector) {
        fetchedConnectors = fetchedConnectors.filter((c) => c.connectorId === defaultConnector);
      }

      setConnectors(fetchedConnectors);
    } catch (err) {
      setError(err as Error);
      setConnectors([]);
    } finally {
      setIsLoading(false);
    }
  }, [inference, isConnectorSelectionRestricted, defaultConnector]);

  // Load connectors on mount
  useEffect(() => {
    loadConnectors();
  }, [loadConnectors]);

  const selectConnector = useCallback(
    (connectorId: string) => {
      // Update state to trigger re-render
      setUserSelectedConnector(connectorId);

      // Store selection in localStorage (unless restricted)
      if (!isConnectorSelectionRestricted) {
        setLastUsedConnector(connectorId);
      }
    },
    [isConnectorSelectionRestricted, setLastUsedConnector]
  );

  return {
    connectors,
    defaultConnector,
    selectedConnector,
    selectConnector,
    isLoading,
    error,
    reloadConnectors: loadConnectors,
  };
}
