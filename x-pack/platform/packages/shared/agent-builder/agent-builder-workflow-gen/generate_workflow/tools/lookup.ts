/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { lookupTriggerDefinitionsForAgent } from '@kbn/workflows-management-plugin/common/build_trigger_definitions_for_agent';
import { builtInStepDefinitions } from '@kbn/workflows';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';
import { getAllConnectors } from '@kbn/workflows-management-plugin/common/schema';
import {
  categorizeConnectorType,
  formatBuiltInStep,
  formatConnectorStep,
  type StepDefinitionForAgent,
} from './lookup_helpers';

export interface LookupDeps {
  api: WorkflowsManagementApi;
  spaceId: string;
  request: KibanaRequest;
}

const buildDynamicConnectorStepEntries = async (
  { api, spaceId, request }: LookupDeps,
  knownIds: Set<string>
): Promise<StepDefinitionForAgent[]> => {
  const { connectorTypes } = await api.getAvailableConnectors(spaceId, request);

  const out: StepDefinitionForAgent[] = [];
  for (const [actionTypeId, info] of Object.entries(connectorTypes)) {
    if (info.enabled === false) continue;
    const baseType = actionTypeId.replace(/^\./, '');
    const stepTypes =
      info.subActions && info.subActions.length > 0
        ? info.subActions.map((sa) => `${baseType}.${sa.name}`)
        : [baseType];

    for (const stepType of stepTypes) {
      if (knownIds.has(stepType)) continue;
      out.push({
        id: stepType,
        label: info.displayName ?? stepType,
        category: categorizeConnectorType(stepType),
        connectorId: 'required',
      });
    }
  }
  return out;
};

export const lookupStepDefinitions = async (
  args: { stepType?: string; search?: string },
  deps: LookupDeps
): Promise<unknown> => {
  const builtInIds = new Set(builtInStepDefinitions.map((s) => s.id));
  const builtIns = builtInStepDefinitions.map(formatBuiltInStep);

  const allConnectors = getAllConnectors().filter((c) => !builtInIds.has(c.type) && !c.deprecation);
  const allConnectorEntries = allConnectors.map(formatConnectorStep);

  const knownIds = new Set<string>(builtInIds);
  for (const c of allConnectors) knownIds.add(c.type);

  const dynamicEntries = await buildDynamicConnectorStepEntries(deps, knownIds);

  const all = [...builtIns, ...allConnectorEntries, ...dynamicEntries];

  let filtered = all;
  if (args.stepType) {
    filtered = filtered.filter((d) => d.id === args.stepType);
  } else if (args.search) {
    const term = args.search.toLowerCase();
    filtered = filtered.filter(
      (d) =>
        d.id.toLowerCase().includes(term) ||
        d.label.toLowerCase().includes(term) ||
        (d.description?.toLowerCase().includes(term) ?? false)
    );
  }

  if (filtered.length === 0) {
    return { error: `No step type matching ${args.stepType ?? args.search ?? 'anything'}` };
  }

  if (filtered.length > 5) {
    return {
      count: filtered.length,
      stepTypes: filtered.map((d) => ({ id: d.id, label: d.label, category: d.category })),
    };
  }
  return { count: filtered.length, stepTypes: filtered };
};

export const lookupTriggerDefinitions = async (
  args: { triggerType?: string },
  { api }: LookupDeps
): Promise<unknown> =>
  lookupTriggerDefinitionsForAgent({
    registeredTriggers: await api.getRegisteredTriggers(),
    triggerType: args.triggerType,
  });
