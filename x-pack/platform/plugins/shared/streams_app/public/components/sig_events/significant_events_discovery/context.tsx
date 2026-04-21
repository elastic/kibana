/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { OBSERVABILITY_STREAMS_ENABLE_MEMORY } from '@kbn/management-settings-ids';
import { useKibana } from '../../../hooks/use_kibana';

interface DiscoverySettingsContextValue {
  isMemoryEnabled: boolean;
  isLoading: boolean;
}

const DiscoverySettingsContext = createContext<DiscoverySettingsContextValue>({
  isMemoryEnabled: false,
  isLoading: true,
});

export const useDiscoverySettings = () => useContext(DiscoverySettingsContext);

export const DiscoverySettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const {
    core: { uiSettings },
  } = useKibana();

  const value = useMemo(
    () => ({
      isMemoryEnabled: uiSettings.get<boolean>(OBSERVABILITY_STREAMS_ENABLE_MEMORY, false),
      isLoading: false,
    }),
    [uiSettings]
  );

  return (
    <DiscoverySettingsContext.Provider value={value}>{children}</DiscoverySettingsContext.Provider>
  );
};
