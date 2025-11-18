/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DataTierRole,
  ListNodesRouteResponse,
  PhaseWithAllocation,
} from '../../../../common/types';

import { phaseToNodePreferenceMap } from '../../../../common/constants';

/**
 * Given a phase and current cluster node roles, determine which nodes the phase
 * will allocate data to. For instance, for the warm phase, with warm
 * tier nodes, we would expect "data_warm".
 *
 * If no nodes can be identified for allocation (very special case) then
 * we return "none".
 */
export const getAvailableNodeRoleForPhase = (
  phase: PhaseWithAllocation,
  nodesByRoles: ListNodesRouteResponse['nodesByRoles']
): DataTierRole | undefined => {
  const preferredNodeRoles = phaseToNodePreferenceMap[phase];

  // The 'data' role covers all node roles, so if we have at least one node with the data role
  // we can allocate to our first preference.
  if (nodesByRoles.data?.length) {
    return preferredNodeRoles[0];
  }

  return preferredNodeRoles.find((role) => Boolean(nodesByRoles[role]?.length));
};
