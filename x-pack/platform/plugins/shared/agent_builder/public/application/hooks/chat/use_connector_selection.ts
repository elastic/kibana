/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { EMPTY } from 'rxjs';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import useObservable from 'react-use/lib/useObservable';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';
import { useKibana } from '../use_kibana';
import { storageKeys } from '../../storage_keys';

export interface UseConnectorSelectionResult {
  selectedConnector?: string;
  selectConnector: (connectorId: string) => void;
  defaultConnectorId?: string;
}

export function useConnectorSelection(): UseConnectorSelectionResult {
  const {
    services: { settings },
  } = useKibana();

  const [selectedConnector, setSelectedConnector] = useLocalStorage<string>(
    storageKeys.lastUsedConnector
  );

  const defaultConnector$ = useMemo(
    () => settings?.client.get$<string | undefined>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR) ?? EMPTY,
    [settings]
  );
  const defaultConnectorId = useObservable(defaultConnector$);

  const selectConnector = useCallback(
    (connectorId: string) => {
      setSelectedConnector(connectorId);
    },
    [setSelectedConnector]
  );

  return {
    selectedConnector,
    selectConnector,
    defaultConnectorId,
  };
}
