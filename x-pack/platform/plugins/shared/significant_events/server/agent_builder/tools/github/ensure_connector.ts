/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { Logger } from '@kbn/core/server';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import { GITHUB_MCP_CONNECTOR_ID, GITHUB_MCP_TOOL_NAMES } from './constants';

const MCP_CONNECTOR_TYPE_ID = '.mcp';

export const ensureGithubMcpConnector = async ({
  server,
  request,
  logger,
}: {
  server: StreamsServer;
  request: KibanaRequest;
  logger: Logger;
}): Promise<{ created: boolean; needsConfigurationUpdate: boolean }> => {
  const actionsClient = await server.actions.getActionsClientWithRequest(request);
  let existing: Awaited<ReturnType<typeof actionsClient.get>> | undefined;
  try {
    existing = await actionsClient.get({ id: GITHUB_MCP_CONNECTOR_ID });
  } catch (error) {
    const statusCode = (error as { output?: { statusCode?: number }; statusCode?: number }).output
      ?.statusCode;
    const directStatusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode !== 404 && directStatusCode !== 404) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/not found/i.test(message)) {
        throw error;
      }
    }
  }

  if (existing) {
    if (existing.actionTypeId !== MCP_CONNECTOR_TYPE_ID) {
      throw new Error(
        `Connector "${GITHUB_MCP_CONNECTOR_ID}" already exists with type "${existing.actionTypeId}"; expected "${MCP_CONNECTOR_TYPE_ID}".`
      );
    }
    const serverUrl = existing.config?.serverUrl;
    const headers = existing.config?.headers as Record<string, unknown> | undefined;
    if (
      serverUrl !== 'https://api.githubcopilot.com/mcp/' ||
      headers?.['X-MCP-Readonly'] !== 'true'
    ) {
      throw new Error(
        `Connector "${GITHUB_MCP_CONNECTOR_ID}" exists but is not the expected read-only GitHub MCP connector.`
      );
    }
    const configuredTools = new Set(
      typeof headers?.['X-MCP-Tools'] === 'string'
        ? headers['X-MCP-Tools'].split(',').map((tool) => tool.trim())
        : []
    );
    const needsConfigurationUpdate =
      configuredTools.size !== GITHUB_MCP_TOOL_NAMES.length ||
      GITHUB_MCP_TOOL_NAMES.some((tool) => !configuredTools.has(tool));
    if (needsConfigurationUpdate) {
      // Connector updates require the complete secret payload. Do not overwrite
      // an existing connector here because doing so could erase the user's token.
      logger.warn(
        `Connector "${GITHUB_MCP_CONNECTOR_ID}" needs its X-MCP-Tools header updated to: ${GITHUB_MCP_TOOL_NAMES.join(
          ','
        )}`
      );
    }
    return { created: false, needsConfigurationUpdate };
  }

  await actionsClient.create({
    action: {
      name: 'GitHub MCP',
      actionTypeId: MCP_CONNECTOR_TYPE_ID,
      config: {
        serverUrl: 'https://api.githubcopilot.com/mcp/',
        hasAuth: true,
        authType: 'bearer',
        headers: {
          'X-MCP-Tools': GITHUB_MCP_TOOL_NAMES.join(','),
          'X-MCP-Readonly': 'true',
          'X-MCP-Insiders': 'false',
        },
      },
      secrets: {},
    },
    options: { id: GITHUB_MCP_CONNECTOR_ID },
  });
  logger.info(
    `Created GitHub MCP connector "${GITHUB_MCP_CONNECTOR_ID}" without credentials; add a bearer token in Connector settings.`
  );
  return { created: true, needsConfigurationUpdate: false };
};
