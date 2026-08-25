/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useMemo } from 'react';

import { useGetEnrollmentSettings } from '../../../hooks';

export const useSelectFleetServerPolicy = (defaultAgentPolicyId?: string) => {
  const [fleetServerPolicyId, setFleetServerPolicyId] = useState<string | undefined>(
    defaultAgentPolicyId
  );
  const { isLoading, isInitialRequest, data, resendRequest } = useGetEnrollmentSettings();

  const eligibleFleetServerPolicies = useMemo(
    () =>
      data?.fleet_server?.policies
        ? data?.fleet_server?.policies?.filter((item) => !item.is_managed)
        : [],
    [data?.fleet_server?.policies]
  );

  useEffect(() => {
    // Default to the first policy found with a fleet server integration installed
    if (eligibleFleetServerPolicies.length === 1 && !fleetServerPolicyId) {
      setFleetServerPolicyId(eligibleFleetServerPolicies[0].id);
    }
  }, [eligibleFleetServerPolicies, fleetServerPolicyId]);

  return {
    isSelectFleetServerPolicyLoading: isLoading && isInitialRequest,
    fleetServerPolicyId,
    setFleetServerPolicyId,
    eligibleFleetServerPolicies: eligibleFleetServerPolicies || [],
    refreshEligibleFleetServerPolicies: resendRequest,
  };
};
