/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';
import { useKibana } from '../../../hooks/use_kibana';
import { useStreamsPrivileges } from '../../../hooks/use_streams_privileges';

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
    dependencies: {
      start: { streams },
    },
  } = useKibana();

  const {
    features: { significantEventsDiscovery },
  } = useStreamsPrivileges();

  const isDiscoveryAvailable = Boolean(
    significantEventsDiscovery?.available && significantEventsDiscovery?.enabled
  );

  const settingsFetch = useStreamsAppFetch(
    async ({ signal }) => {
      if (!isDiscoveryAvailable) {
        return undefined;
      }
      return streams.streamsRepositoryClient.fetch(
        'GET /internal/streams/_significant_events/settings',
        { signal }
      );
    },
    [streams.streamsRepositoryClient, isDiscoveryAvailable]
  );

  const value = useMemo(
    () => ({
      isMemoryEnabled: settingsFetch.value?.useMemory === true,
      isLoading: isDiscoveryAvailable && settingsFetch.loading,
    }),
    [settingsFetch.value?.useMemory, settingsFetch.loading, isDiscoveryAvailable]
  );

  return (
    <DiscoverySettingsContext.Provider value={value}>{children}</DiscoverySettingsContext.Provider>
  );
};
