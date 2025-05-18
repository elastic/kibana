/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useState, useEffect } from 'react';

import type { GetFleetStatusResponse } from '../types';

import { useStartServices } from './use_core';
import { useConfig } from './use_config';
import { useGetFleetStatusQuery } from './use_request';

export interface FleetStatusProviderProps {
  enabled: boolean;
  isLoading: boolean;
  isReady: boolean;
  error?: Error;
  missingRequirements?: GetFleetStatusResponse['missing_requirements'];
  missingOptionalFeatures?: GetFleetStatusResponse['missing_optional_features'];
  isSecretsStorageEnabled?: GetFleetStatusResponse['is_secrets_storage_enabled'];
  isSpaceAwarenessEnabled?: GetFleetStatusResponse['is_space_awareness_enabled'];
  spaceId?: string;
}

interface FleetStatus extends FleetStatusProviderProps {
  refetch: () => Promise<unknown>;

  // This flag allows us to opt into displaying the Fleet Server enrollment instructions even if
  // a healthy Fleet Server has been detected, so we can delay removing the enrollment UI until
  // some user action like clicking a "continue" button
  forceDisplayInstructions: boolean;
  setForceDisplayInstructions: React.Dispatch<boolean>;
}

const FleetStatusContext = React.createContext<FleetStatus | undefined>(undefined);

export const FleetStatusProvider: React.FC<{
  children: React.ReactNode;
  defaultFleetStatus?: FleetStatusProviderProps;
}> = ({ defaultFleetStatus, children }) => {
  const config = useConfig();
  const { spaces } = useStartServices();
  const [spaceId, setSpaceId] = useState<string | undefined>();
  const [forceDisplayInstructions, setForceDisplayInstructions] = useState(false);

  const { data, isLoading, refetch } = useGetFleetStatusQuery();
  useEffect(() => {
    const getSpace = async () => {
      if (spaces) {
        const space = await spaces.getActiveSpace();
        setSpaceId(space.id);
      }
    };
    getSpace();
  }, [spaces]);

  const state = {
    ...defaultFleetStatus,
    enabled: config.agents.enabled,
    isLoading,
    isReady: (!isLoading && data?.isReady) ?? defaultFleetStatus?.isReady ?? false,
    missingRequirements: data?.missing_requirements,
    missingOptionalFeatures: data?.missing_optional_features,
    isSecretsStorageEnabled: data?.is_secrets_storage_enabled,
    isSpaceAwarenessEnabled: data?.is_space_awareness_enabled,
    spaceId,
  };

  return (
    <FleetStatusContext.Provider
      value={{
        ...state,
        refetch,
        forceDisplayInstructions,
        setForceDisplayInstructions,
      }}
    >
      {children}
    </FleetStatusContext.Provider>
  );
};

export function useFleetStatus(): FleetStatus {
  const context = useContext(FleetStatusContext);

  if (!context) {
    throw new Error('FleetStatusContext not set');
  }

  return context;
}
