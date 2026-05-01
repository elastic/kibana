/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { BaseStepDefinition } from '@kbn/workflows';
import { builtInStepDefinitions, builtInTriggerDefinitions } from '@kbn/workflows';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type { ConnectorSummary, StepDefinitionSummary, TriggerDefinitionSummary } from './types';

interface DepsBase {
  api: WorkflowsManagementApi;
  spaceId: string;
  request: KibanaRequest;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
}

const toSummary = (s: BaseStepDefinition): StepDefinitionSummary => ({
  id: s.id,
  label: s.label,
  description: s.description,
  category: s.category as string,
});

export const prefetchConnectors = async ({
  api,
  spaceId,
  request,
}: DepsBase): Promise<ConnectorSummary[]> => {
  const { connectorTypes } = await api.getAvailableConnectors(spaceId, request);
  const summaries: ConnectorSummary[] = [];

  for (const [actionTypeId, info] of Object.entries(connectorTypes)) {
    if (info.enabled === false) continue;
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
  workflowsExtensions,
}: DepsBase): Promise<StepDefinitionSummary[]> => {
  const builtInIds = new Set(builtInStepDefinitions.map((s) => s.id));

  const builtIns: StepDefinitionSummary[] = builtInStepDefinitions
    .filter((s) => !s.deprecation)
    .map(toSummary);

  // Custom step definitions registered via workflowsExtensions
  // (e.g. agent_builder.run_agent, agent_builder.rerank).
  await workflowsExtensions.isReady();
  const customStepDefs = workflowsExtensions.getAllStepDefinitions();
  const customSummaries: StepDefinitionSummary[] = customStepDefs
    .filter((s) => !builtInIds.has(s.id) && !s.deprecation)
    .map(toSummary);

  const { connectorTypes } = await api.getAvailableConnectors(spaceId, request);
  const connectorSummaries: StepDefinitionSummary[] = [];

  for (const [actionTypeId, info] of Object.entries(connectorTypes)) {
    if (info.enabled === false) continue;

    const baseType = actionTypeId.replace(/^\./, '');
    const stepTypes =
      info.subActions && info.subActions.length > 0
        ? info.subActions.map((sa) => `${baseType}.${sa.name}`)
        : [baseType];

    for (const stepType of stepTypes) {
      if (builtInIds.has(stepType)) continue;
      connectorSummaries.push({
        id: stepType,
        label: info.displayName ?? stepType,
        category: categorizeConnectorType(stepType),
      });
    }
  }

  return [...builtIns, ...customSummaries, ...connectorSummaries];
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
