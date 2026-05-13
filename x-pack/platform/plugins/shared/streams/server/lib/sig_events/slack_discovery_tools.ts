/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { ToolCallback, ToolDefinition, ToolSchema } from '@kbn/inference-common';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { getConnectorSpec, isToolAction } from '@kbn/connector-specs';
import type { InsightsMemoryTools } from './insights/generate_insights';

const SLACK_CONNECTOR_TYPE = '.slack2';

const getErrorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

/**
 * Loads all `.slack2` connectors available to the current request and bridges
 * their `isTool: true` sub-actions into the `tools` / `callbacks` shape
 * consumed by the sig-events discovery reasoning agent.
 *
 * Returns `undefined` when no Slack v2 connectors are configured.
 */
export const createSlackDiscoveryTools = async ({
  actions,
  request,
  logger,
}: {
  actions: ActionsPluginStart;
  request: KibanaRequest;
  logger: Logger;
}): Promise<InsightsMemoryTools | undefined> => {
  let actionsClient;
  try {
    actionsClient = await actions.getActionsClientWithRequest(request);
  } catch (err) {
    logger.warn(`Failed to get actions client for Slack discovery tools: ${getErrorMessage(err)}`);
    return undefined;
  }

  let allConnectors;
  try {
    allConnectors = await actionsClient.getAll();
  } catch (err) {
    logger.warn(`Failed to list connectors for Slack discovery tools: ${getErrorMessage(err)}`);
    return undefined;
  }

  const slackConnectors = allConnectors.filter((c) => c.actionTypeId === SLACK_CONNECTOR_TYPE);

  if (slackConnectors.length === 0) {
    return undefined;
  }

  const spec = getConnectorSpec(SLACK_CONNECTOR_TYPE);
  if (!spec) {
    logger.warn(`No connector spec found for type '${SLACK_CONNECTOR_TYPE}'`);
    return undefined;
  }

  const tools: Record<string, ToolDefinition> = {};
  const callbacks: Record<string, ToolCallback> = {};

  for (const connector of slackConnectors) {
    const connectorPrefix = `slack_${connector.id.replace(/[^a-zA-Z0-9_]/g, '_')}`;

    for (const [subAction, actionSpec] of Object.entries(spec.actions)) {
      if (!isToolAction(spec, subAction)) {
        continue;
      }

      const toolName = `${connectorPrefix}_${subAction}`;

      let jsonSchema: ToolSchema;
      try {
        const zodSchema = actionSpec.input as ReturnType<typeof z.object>;
        jsonSchema = z.toJSONSchema(zodSchema) as ToolSchema;
      } catch (err) {
        logger.debug(
          `Skipping Slack tool "${toolName}" — schema unavailable: ${getErrorMessage(err)}`
        );
        continue;
      }

      const connectorLabel =
        slackConnectors.length > 1 ? ` (connector: ${connector.name})` : '';
      tools[toolName] = {
        description: `${actionSpec.description}${connectorLabel}`,
        schema: jsonSchema,
      };

      callbacks[toolName] = async (toolCall) => {
        const subActionParams = (toolCall.function.arguments ?? {}) as Record<string, unknown>;
        try {
          const result = await actionsClient.execute({
            actionId: connector.id,
            params: { subAction, subActionParams },
          });

          if (result.status === 'error') {
            return { response: { error: result.message ?? 'Slack sub-action returned an error' } };
          }

          return { response: { result: result.data } };
        } catch (err) {
          logger.warn(`Slack tool "${toolName}" execution failed: ${getErrorMessage(err)}`);
          return { response: { error: getErrorMessage(err) } };
        }
      };
    }
  }

  if (Object.keys(tools).length === 0) {
    return undefined;
  }

  const connectorNames = slackConnectors.map((c) => c.name).join(', ');
  const toolNames = Object.keys(tools)
    .map((n) => `- **${n}**`)
    .join('\n');

  const systemPromptSnippet = `
You have access to Slack tools from the following connector(s): ${connectorNames}.
Use these tools to search Slack messages, list channels, and look up information that may help understand the stream's domain context — for example, incidents, deployment discussions, or team announcements relevant to the data you are analysing:
${toolNames}

Use Slack tools when the stream's data suggests that relevant context may exist in Slack (e.g. error spikes correlating with deployment announcements). Prefer analysing the stream's own data first; use Slack to enrich or cross-reference your findings.`;

  return { tools, callbacks, systemPromptSnippet };
};
