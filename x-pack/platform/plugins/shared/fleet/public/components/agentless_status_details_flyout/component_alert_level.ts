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

/** Worst unit status among the inputs/outputs of the given package policy. */
export const getComponentAlertLevel = (
  agent: Agent,
  packagePolicy: PackagePolicy
): ComponentAlertLevel => {
  const { components } = agent;
  if (!components) return null;
  const units = packagePolicy.inputs.flatMap((input) => {
    const inputId = input.id ?? packagePolicy.id;
    return [
      ...getInputUnitsByPackage(components, inputId),
      ...getOutputUnitsByPackage(components, inputId),
    ];
  });
  if (units.some((u) => u.status === 'FAILED')) return 'failed';
  if (units.some((u) => u.status === 'DEGRADED')) return 'degraded';
  return null;
};
