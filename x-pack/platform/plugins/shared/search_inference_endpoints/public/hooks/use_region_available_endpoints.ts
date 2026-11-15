/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { isConnectorUnavailableUnderRegionPolicy } from '../utils/is_unavailable_under_region_policy';
import { useConnectors } from './use_connectors';

interface RegionAvailableEndpoints {
  regionDeniedEndpointIds: ReadonlySet<string>;
  availableEndpointIds: string[];
}

/**
 * Returns the region-denied endpoint IDs and the assigned endpoints the region policy allows.
 */
export const useRegionAvailableEndpoints = (endpointIds: string[]): RegionAvailableEndpoints => {
  const { data: connectors = [] } = useConnectors();

  const regionDeniedEndpointIds = useMemo(
    () =>
      new Set(
        connectors
          .filter(isConnectorUnavailableUnderRegionPolicy)
          .map((connector) => connector.connectorId)
      ),
    [connectors]
  );

  const availableEndpointIds = useMemo(
    () => endpointIds.filter((endpointId) => !regionDeniedEndpointIds.has(endpointId)),
    [endpointIds, regionDeniedEndpointIds]
  );

  return { regionDeniedEndpointIds, availableEndpointIds };
};
