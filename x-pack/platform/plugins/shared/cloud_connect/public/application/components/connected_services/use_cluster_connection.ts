/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';
import { useCloudConnectedAppContext } from '../../app_context';
import type { ClusterDetails, ServiceType } from '../../../types';

/**
 * Creates a new ClusterDetails object with an updated service enabled state.
 *
 * This is a pure function that performs an immutable update, preserving all
 * other properties of the ClusterDetails object and the specific service.
 */
export const updateServiceEnabled = (
  clusterDetails: ClusterDetails | null,
  serviceKey: ServiceType,
  enabled: boolean
): ClusterDetails | null => {
  // If cluster details haven't been loaded yet or the service doesn't exist,
  // return the current state unchanged (no-op). This prevents updates before
  // initial data load and ensures we don't try to update non-existent services.
  if (!clusterDetails || !clusterDetails.services[serviceKey]) {
    return clusterDetails;
  }

  return {
    ...clusterDetails,
    services: {
      ...clusterDetails.services,
      [serviceKey]: {
        ...clusterDetails.services[serviceKey],
        enabled,
      },
    },
  };
};

/**
 * Hook to manage the cluster connection state and related actions.
 *
 * This hook serves as the single source of truth for cluster details after
 * the initial API load. It provides:
 * - Cluster details state (initialized from API, then managed locally)
 * - Loading and error states from the initial fetch
 * - Actions for connecting, disconnecting, and updating services
 *
 * Local state management allows for optimistic UI updates without waiting
 * for API refetches, providing a smoother user experience.
 */
export const useClusterConnection = () => {
  const { apiService } = useCloudConnectedAppContext();
  const {
    data: initialClusterDetails,
    isLoading,
    error,
    resendRequest: refetchClusterDetails,
  } = apiService.useLoadClusterDetails();

  // Local state becomes the source of truth after initial API load.
  // This allows optimistic updates without waiting for refetches.
  const [clusterDetails, setClusterDetails] = useState<ClusterDetails | null>(null);

  // Initialize local state when API response arrives
  useEffect(() => {
    if (initialClusterDetails) {
      setClusterDetails(initialClusterDetails);
    }
  }, [initialClusterDetails]);

  /**
   * Optimistically updates a service's enabled state.
   * Called after a successful API call to immediately reflect the change in the UI.
   */
  const handleServiceUpdate = (serviceKey: ServiceType, enabled: boolean) => {
    setClusterDetails((prev) => updateServiceEnabled(prev, serviceKey, enabled));
  };

  /**
   * Clears cluster details to immediately show the onboarding view.
   * Called after a successful disconnect API call.
   */
  const handleDisconnect = () => {
    setClusterDetails(null);
  };

  return {
    clusterDetails,
    isLoading,
    error,
    handleServiceUpdate,
    handleDisconnect,
    handleConnect: refetchClusterDetails,
  };
};
