/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentContextLayerPluginStart } from '@kbn/agent-context-layer-plugin/server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { ToolCallback, ToolDefinition } from '@kbn/inference-common';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import type { Logger } from '@kbn/logging';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import type { MemoryService } from '../../memory';
import { createReadMemoryPageCallback, formatExistingPages } from '../../memory/tool_callbacks';
import { INSIGHTS_DISCOVERY_MEMORY_TOOLS } from './prompts/shared/insights_memory_tools';
import { createInsightsDiscoveryConnectorContext } from './prompts/shared/insights_discovery_connector_tools';

export const INSIGHTS_DISCOVERY_MAX_STEPS = 15;

export interface InsightsDiscoveryAgentContext {
  additionalTools: Record<string, ToolDefinition>;
  toolCallbacks: Record<string, ToolCallback>;
  systemPromptSuffix: string;
  maxSteps: number;
}

const buildMemoryPromptSuffix = (existingPagesSummary: string) =>
  [
    '## Existing sigevents memory pages',
    '',
    existingPagesSummary,
    '',
    'Use `read_memory_page` to load full content for pages relevant to this analysis before submitting insights.',
  ].join('\n');

export const loadInsightsDiscoveryAgentContext = async ({
  memory,
  agentContextLayer,
  actions,
  esClient,
  request,
  spaceId,
  savedObjectsClient,
  uiSettingsClient,
  logger,
}: {
  memory?: MemoryService;
  agentContextLayer?: AgentContextLayerPluginStart;
  actions?: ActionsPluginStart;
  esClient: IScopedClusterClient;
  request: KibanaRequest;
  spaceId: string;
  savedObjectsClient: SavedObjectsClientContract;
  uiSettingsClient: IUiSettingsClient;
  logger: Logger;
}): Promise<InsightsDiscoveryAgentContext> => {
  const suffixParts: string[] = [];
  const additionalTools: Record<string, ToolDefinition> = {};
  const toolCallbacks: Record<string, ToolCallback> = {};

  if (memory) {
    const entries = await memory.listAll();
    Object.assign(additionalTools, INSIGHTS_DISCOVERY_MEMORY_TOOLS);
    toolCallbacks.read_memory_page = createReadMemoryPageCallback({
      memory,
    }) as unknown as ToolCallback;
    suffixParts.push(buildMemoryPromptSuffix(formatExistingPages(entries)));
  }

  const experimentalFeaturesEnabled = await uiSettingsClient
    .get<boolean>(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID)
    .catch(() => false);

  if (experimentalFeaturesEnabled && agentContextLayer && actions) {
    const connectorContext = createInsightsDiscoveryConnectorContext({
      agentContextLayer,
      actions,
      esClient,
      request,
      spaceId,
      savedObjectsClient,
      logger,
    });
    Object.assign(additionalTools, connectorContext.tools);
    Object.assign(toolCallbacks, connectorContext.toolCallbacks);
    suffixParts.push(connectorContext.promptSuffix);
  }

  return {
    additionalTools,
    toolCallbacks: toolCallbacks as Record<string, ToolCallback>,
    systemPromptSuffix: suffixParts.join('\n\n'),
    maxSteps: INSIGHTS_DISCOVERY_MAX_STEPS,
  };
};
