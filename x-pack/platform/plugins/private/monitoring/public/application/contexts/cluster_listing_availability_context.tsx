/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { createContext, useContext, useMemo } from 'react';
import { CODE_PATH_ELASTICSEARCH } from '../../../common/constants';
import { useClusters } from '../hooks/use_clusters';

export interface ClusterListingAvailability {
  loaded: boolean;
  clusterCount: number;
  hasClusterListing: boolean;
}

const CODE_PATHS = [CODE_PATH_ELASTICSEARCH];

const defaultValue: ClusterListingAvailability = {
  loaded: false,
  clusterCount: 0,
  hasClusterListing: false,
};

const ClusterListingAvailabilityContext = createContext<ClusterListingAvailability>(defaultValue);

export const ClusterListingAvailabilityProvider: FC<PropsWithChildren> = ({ children }) => {
  const { clusters, loaded } = useClusters(null, undefined, CODE_PATHS);
  const value = useMemo<ClusterListingAvailability>(() => {
    const clusterCount = clusters.length;
    return {
      loaded: loaded === true,
      clusterCount,
      hasClusterListing: loaded === true && clusterCount > 1,
    };
  }, [clusters.length, loaded]);

  return (
    <ClusterListingAvailabilityContext.Provider value={value}>
      {children}
    </ClusterListingAvailabilityContext.Provider>
  );
};

export const useClusterListingAvailability = (): ClusterListingAvailability =>
  useContext(ClusterListingAvailabilityContext);
