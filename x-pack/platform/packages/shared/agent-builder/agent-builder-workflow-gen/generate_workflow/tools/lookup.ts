/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { builtInStepDefinitions, builtInTriggerDefinitions } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';
import { getAllConnectors } from '@kbn/workflows-management-plugin/common/schema';
import { AlertEventSchema } from '@kbn/workflows/spec/schema/triggers/alert_trigger_schema';
import { BaseEventSchema } from '@kbn/workflows/spec/schema/common/base_event';
import {
  categorizeConnectorType,
  formatBuiltInStep,
  formatConnectorStep,
  type StepDefinitionForAgent,
} from './lookup_helpers';

const zodToJsonSchemaSafe = (schema: z.ZodType): unknown => {
  try {
    return z.toJSONSchema(schema, { target: 'draft-7', unrepresentable: 'any' });
  } catch {
    return undefined;
  }
};

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

  // Match the existing tool: detailed only when ≤5 results.
  if (filtered.length > 5) {
    return {
      count: filtered.length,
      stepTypes: filtered.map((d) => ({ id: d.id, label: d.label, category: d.category })),
    };
  }
  return { count: filtered.length, stepTypes: filtered };
};

export const lookupTriggerDefinitions = async (args: {
  triggerType?: string;
}): Promise<unknown> => {
  let defs = builtInTriggerDefinitions.map((def) => ({
    id: def.id,
    label: def.label,
    description: def.description,
    jsonSchema: zodToJsonSchemaSafe(def.schema),
    eventContextSchema:
      def.id === 'alert'
        ? zodToJsonSchemaSafe(AlertEventSchema)
        : zodToJsonSchemaSafe(BaseEventSchema),
    examples: def.documentation?.examples,
  }));

  if (args.triggerType) {
    defs = defs.filter((d) => d.id === args.triggerType);
  }

  if (defs.length === 0) {
    return {
      error: `Trigger type "${args.triggerType}" not found`,
      availableTypes: builtInTriggerDefinitions.map((d) => d.id),
    };
  }
  return { count: defs.length, triggerTypes: defs };
};
