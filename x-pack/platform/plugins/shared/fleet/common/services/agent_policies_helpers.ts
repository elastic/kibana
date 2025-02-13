/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';

import type { NewAgentPolicy, AgentPolicy } from '../types';
import {
  FLEET_SERVER_PACKAGE,
  FLEET_APM_PACKAGE,
  FLEET_SYNTHETICS_PACKAGE,
  FLEET_ENDPOINT_PACKAGE,
} from '../constants';

export function getDefaultFleetServerpolicyId(spaceId?: string) {
  return !spaceId || spaceId === '' || spaceId === DEFAULT_SPACE_ID
    ? 'fleet-server-policy'
    : `${spaceId}-fleet-server-policy`;
}

export function policyHasFleetServer(
  agentPolicy: Pick<AgentPolicy, 'package_policies' | 'has_fleet_server'>
) {
  if (!agentPolicy.package_policies) {
    return false;
  }
  return (
    agentPolicy.package_policies?.some((p) => p.package?.name === FLEET_SERVER_PACKAGE) ||
    !!agentPolicy.has_fleet_server
  );
}

export function policyHasAPMIntegration(agentPolicy: AgentPolicy) {
  return policyHasIntegration(agentPolicy, FLEET_APM_PACKAGE);
}

export function policyHasSyntheticsIntegration(agentPolicy: AgentPolicy) {
  return policyHasIntegration(agentPolicy, FLEET_SYNTHETICS_PACKAGE);
}

export function policyHasEndpointSecurity(agentPolicy: Partial<NewAgentPolicy | AgentPolicy>) {
  return policyHasIntegration(agentPolicy as AgentPolicy, FLEET_ENDPOINT_PACKAGE);
}

function policyHasIntegration(agentPolicy: AgentPolicy, packageName: string) {
  if (!agentPolicy.package_policies) {
    return false;
  }

  return agentPolicy.package_policies?.some((p) => p.package?.name === packageName);
}

export function getInheritedNamespace(agentPolicies: AgentPolicy[], defaultValue?: string): string {
  if (agentPolicies.length === 1) {
    return agentPolicies[0].namespace;
  }
  return defaultValue ?? 'default';
}
