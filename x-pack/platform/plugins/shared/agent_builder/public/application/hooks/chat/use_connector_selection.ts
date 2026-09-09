/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { BehaviorSubject, EMPTY } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';
import { useKibana } from '../use_kibana';
import { storageKeys } from '../../storage_keys';

const readStoredConnectorId = (): string | undefined => {
  const raw = localStorage.getItem(storageKeys.lastUsedConnector);
  if (!raw) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'string' ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const connectorId$ = new BehaviorSubject<string | undefined>(readStoredConnectorId());

const writeStoredConnectorId = (connectorId: string): void => {
  try {
    localStorage.setItem(storageKeys.lastUsedConnector, JSON.stringify(connectorId));
  } catch {
    // quota exceeded — keep the in-memory value, drop persistence
  }
  connectorId$.next(connectorId);
};

export const _resetConnectorSelectionStore = (): void => {
  connectorId$.next(readStoredConnectorId());
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

  const selectedConnector = useObservable(connectorId$, connectorId$.getValue());

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
