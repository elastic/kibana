/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';

import { ExperimentalFeaturesService } from '../services';

import { useAuthz } from './use_authz';
import { useGetSpaceSettings } from './use_request';

const spaceSettingsContext = createContext<{
  isInitialLoading?: boolean;
  allowedNamespacePrefixes: string[];
  defaultNamespace: string;
}>({
  allowedNamespacePrefixes: [],
  defaultNamespace: 'default',
});

export const SpaceSettingsContextProvider: React.FC<{
  enabled?: boolean;
  children?: React.ReactNode;
}> = ({ enabled = true, children }) => {
  const useSpaceAwareness = ExperimentalFeaturesService.get()?.useSpaceAwareness ?? false;
  const authz = useAuthz();
  const isAllowed =
    authz.fleet.allAgentPolicies ||
    authz.fleet.allSettings ||
    authz.integrations.writeIntegrationPolicies;
  const spaceSettingsReq = useGetSpaceSettings({
    enabled: useSpaceAwareness && enabled && isAllowed,
  });

  const settings = React.useMemo(() => {
    return {
      isInitialLoading: spaceSettingsReq.isInitialLoading,
      allowedNamespacePrefixes: spaceSettingsReq.data?.item.allowed_namespace_prefixes ?? [],
      defaultNamespace: spaceSettingsReq.data?.item.allowed_namespace_prefixes?.[0] ?? 'default',
    };
  }, [spaceSettingsReq.isInitialLoading, spaceSettingsReq.data]);

  return <spaceSettingsContext.Provider value={settings}>{children}</spaceSettingsContext.Provider>;
};

export function useSpaceSettingsContext() {
  return useContext(spaceSettingsContext);
}
