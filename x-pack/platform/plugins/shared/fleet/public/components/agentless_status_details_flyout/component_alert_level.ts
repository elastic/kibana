/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent, PackagePolicy } from '../../types';
import {
  getInputUnitsByPackage,
  getOutputUnitsByPackage,
} from '../../applications/fleet/sections/agents/agent_details_page/components/agent_details/input_status_utils';

export type ComponentAlertLevel = 'failed' | 'degraded' | null;

const getPackagePolicyUnits = (agent: Agent, packagePolicy: PackagePolicy) => {
  const { components } = agent;
  if (!components) return [];
  const units = packagePolicy.inputs.flatMap((input) => {
    const inputId = input.id ?? packagePolicy.id;
    return [
      ...getInputUnitsByPackage(components, inputId),
      ...getOutputUnitsByPackage(components, inputId),
    ];
  });
  // The input and output lookups overlap on output units whose id contains the input id.
  return [...new Set(units)];
};

/** Worst unit status among the inputs/outputs of the given package policy. */
export const getComponentAlertLevel = (
  agent: Agent,
  packagePolicy: PackagePolicy
): ComponentAlertLevel => {
  const units = getPackagePolicyUnits(agent, packagePolicy);
  if (units.some((u) => u.status === 'FAILED')) return 'failed';
  if (units.some((u) => u.status === 'DEGRADED')) return 'degraded';
  return null;
};

export interface PackagePolicyUnitSummary {
  /** Units the agent reports for the package policy; 0 means it is not running it at all. */
  total: number;
  /** Units that are stopping or stopped. */
  stopped: number;
}

/** How many units of the given package policy the agent reports, and how many are not running. */
export const getPackagePolicyUnitSummary = (
  agent: Agent,
  packagePolicy: PackagePolicy
): PackagePolicyUnitSummary => {
  const units = getPackagePolicyUnits(agent, packagePolicy);
  return {
    total: units.length,
    stopped: units.filter((u) => u.status === 'STOPPING' || u.status === 'STOPPED').length,
  };
};
