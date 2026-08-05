/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { EMPTY } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';
import { useKibana } from '../use_kibana';
import { storageKeys } from '../../storage_keys';

type ConnectorIdListener = (connectorId: string | undefined) => void;
const connectorIdListeners = new Set<ConnectorIdListener>();

const readStoredConnectorId = (): string | undefined => {
  try {
    const raw = localStorage.getItem(storageKeys.lastUsedConnector);
    if (!raw) return undefined;
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'string' ? parsed : undefined;
  } catch {
    return undefined;
  }
};

let storedConnectorId: string | undefined = readStoredConnectorId();

const writeStoredConnectorId = (connectorId: string): void => {
  storedConnectorId = connectorId;
  try {
    localStorage.setItem(storageKeys.lastUsedConnector, JSON.stringify(connectorId));
  } catch {
    // ignore persistence failures (private mode / quota); in-memory value and listeners still update
  }
  connectorIdListeners.forEach((l) => l(connectorId));
};

export const _resetConnectorSelectionStore = (): void => {
  storedConnectorId = readStoredConnectorId();
  connectorIdListeners.clear();
};

export interface UseConnectorSelectionResult {
  selectedConnector?: string;
  selectConnector: (connectorId: string) => void;
  defaultConnectorId?: string;
  defaultConnectorOnly: boolean;
}

export function useConnectorSelection(): UseConnectorSelectionResult {
  const {
    services: { settings },
  } = useKibana();

  const [selectedConnector, setSelectedConnector] = useState<string | undefined>(storedConnectorId);

  useEffect(() => {
    connectorIdListeners.add(setSelectedConnector);
    return () => {
      connectorIdListeners.delete(setSelectedConnector);
    };
  }, []);

  const defaultConnector$ = useMemo(
    () => settings?.client.get$<string | undefined>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) ?? EMPTY,
    [settings]
  );
  const defaultConnectorId = useObservable(defaultConnector$);

  const defaultConnectorOnly$ = useMemo(
    () =>
      settings?.client.get$<boolean>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY) ?? EMPTY,
    [settings]
  );
  const defaultConnectorOnly = useObservable(defaultConnectorOnly$, false) ?? false;

  const selectConnector = useCallback((connectorId: string) => {
    writeStoredConnectorId(connectorId);
  }, []);

  return {
    selectedConnector,
    selectConnector,
    defaultConnectorId,
    defaultConnectorOnly,
  };
}
