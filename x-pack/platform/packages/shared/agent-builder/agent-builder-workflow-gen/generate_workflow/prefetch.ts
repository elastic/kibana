/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { BaseStepDefinition, ConnectorContractUnion } from '@kbn/workflows';
import { builtInStepDefinitions, builtInTriggerDefinitions } from '@kbn/workflows';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';
import { getAllConnectors } from '@kbn/workflows-management-plugin/common/schema';
import { pickLabelAndDescription } from './tools/lookup_helpers';
import type { ConnectorSummary, StepDefinitionSummary, TriggerDefinitionSummary } from './types';

interface DepsBase {
  api: WorkflowsManagementApi;
  spaceId: string;
  request: KibanaRequest;
}

const toSummary = (s: BaseStepDefinition): StepDefinitionSummary => ({
  id: s.id,
  label: s.label,
  description: s.description,
  category: s.category as string,
});

const toConnectorSummary = (c: ConnectorContractUnion): StepDefinitionSummary => {
  const { label, description } = pickLabelAndDescription(c);
  return {
    id: c.type,
    label,
    description,
    category: categorizeConnectorType(c.type),
  };
};

export const prefetchConnectors = async ({
  api,
  spaceId,
  request,
}: DepsBase): Promise<ConnectorSummary[]> => {
  const { connectorTypes } = await api.getAvailableConnectors(spaceId, request);
  const summaries: ConnectorSummary[] = [];

  for (const [actionTypeId, info] of Object.entries(connectorTypes)) {
    if (info.enabled === false) {
      continue;
    }
    const baseStepType = actionTypeId.replace(/^\./, '');
    const stepTypes =
      info.subActions && info.subActions.length > 0
        ? info.subActions.map((sa) => `${baseStepType}.${sa.name}`)
        : [baseStepType];

    for (const instance of info.instances ?? []) {
      summaries.push({
        id: instance.id,
        name: instance.name,
        actionTypeId,
        stepTypes,
      });
    }
  }

  return summaries;
};

export const prefetchStepDefinitions = async ({
  api,
  spaceId,
  request,
}: DepsBase): Promise<StepDefinitionSummary[]> => {
  const builtInIds = new Set(builtInStepDefinitions.map((s) => s.id));

  const builtIns: StepDefinitionSummary[] = builtInStepDefinitions
    .filter((s) => !s.deprecation)
    .map(toSummary);

  // All connector contracts known to the workflow system: static internal
  // connectors (`elasticsearch.request`, `kibana.request`, …), generated
  // Elasticsearch / Kibana API contracts (`elasticsearch.indices.create`,
  // `elasticsearch.search`, …), plus step definitions registered via
  // `workflowsExtensions`. Already excludes built-in flow control / data.* /
  // ai.* steps which come from `builtInStepDefinitions` above.
  const allConnectors = getAllConnectors();
  const allConnectorIds = new Set<string>();
  const allConnectorSummaries: StepDefinitionSummary[] = [];
  for (const c of allConnectors) {
    if (builtInIds.has(c.type) || c.deprecation) {
      continue;
    }
    allConnectorIds.add(c.type);
    allConnectorSummaries.push(toConnectorSummary(c));
  }

  // Dynamic Kibana action-type connectors (slack, jira, inference.*, …).
  // These are NOT in `getAllConnectors`; they're derived per-space from the
  // user's configured action instances.
  const { connectorTypes } = await api.getAvailableConnectors(spaceId, request);
  const dynamicSummaries: StepDefinitionSummary[] = [];

  for (const [actionTypeId, info] of Object.entries(connectorTypes)) {
    if (info.enabled === false) {
      continue;
    }

    const baseType = actionTypeId.replace(/^\./, '');
    const stepTypes =
      info.subActions && info.subActions.length > 0
        ? info.subActions.map((sa) => `${baseType}.${sa.name}`)
        : [baseType];

    for (const stepType of stepTypes) {
      if (builtInIds.has(stepType) || allConnectorIds.has(stepType)) continue;
      dynamicSummaries.push({
        id: stepType,
        label: info.displayName ?? stepType,
        category: categorizeConnectorType(stepType),
      });
    }
  }

  return [...builtIns, ...allConnectorSummaries, ...dynamicSummaries];
};

export const prefetchTriggerDefinitions = async (): Promise<TriggerDefinitionSummary[]> =>
  builtInTriggerDefinitions.map((t) => ({
    id: t.id,
    label: t.label,
    description: t.description,
  }));

function categorizeConnectorType(type: string): string {
  if (type.startsWith('kibana.')) return 'kibana';
  if (type.startsWith('cases.')) return 'kibana_cases';
  if (type.startsWith('elasticsearch.')) return 'elasticsearch';
  if (type.startsWith('ai.')) return 'ai';
  if (type.startsWith('data.')) return 'data';
  return 'external';
}
