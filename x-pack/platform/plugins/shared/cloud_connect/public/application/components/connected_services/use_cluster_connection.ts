/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';
import { apiService } from '../../../lib/api';
import type { ClusterDetails } from '../../../types';

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
  const handleServiceUpdate = (serviceKey: string, enabled: boolean) => {
    setClusterDetails((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        services: {
          ...prev.services,
          [serviceKey]: {
            ...prev.services[serviceKey as keyof typeof prev.services],
            enabled,
          },
        },
      };
    });
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
