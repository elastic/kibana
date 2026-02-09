/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  ActionResult,
  PluginStartContract as ActionsPluginStart,
} from '@kbn/actions-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { Logger } from '@kbn/core/server';
import type { MCPConnectorConfig } from '@kbn/connector-schemas/mcp';
import type { StackConnectorConfig } from '@kbn/data-catalog-plugin';
import { bulkCreateMcpTools } from '@kbn/agent-builder-plugin/server/services/tools/utils/bulk_create_mcp_tools';
import type { ToolRegistry } from '@kbn/agent-builder-plugin/server/services/tools';
import { getNamedMcpTools } from '@kbn/agent-builder-plugin/server/services/tools/tool_types/mcp/tool_type';
import { connectorsSpecs } from '@kbn/connector-specs';
import type { ConnectorSecrets } from '@kbn/data-catalog-plugin/common/data_source_spec';

/**
 * Builds the secrets object for a connector based on its spec
 * @param connectorType - The connector type ID (e.g., '.notion')
 * @param token - The authentication token
 * @returns The secrets object to pass to the actions client
 * @throws Error if the connector spec is not found
 */
function buildSecretsFromConnectorSpec(
  connectorType: string,
  credentials: string
): ConnectorSecrets {
  const connectorSpec = Object.values(connectorsSpecs).find(
    (spec) => spec.metadata.id === connectorType
  );
  if (!connectorSpec) {
    throw new Error(`Stack connector spec not found for type "${connectorType}"`);
  }

  const hasBearerAuth = connectorSpec.auth?.types.some((authType) => {
    const typeId = typeof authType === 'string' ? authType : authType.type;
    return typeId === 'bearer';
  });

  const secrets: Record<string, string> = {};
  if (hasBearerAuth) {
    secrets.authType = 'bearer';
    secrets.token = credentials;
  } else {
    const apiKeyHeaderAuth = connectorSpec.auth?.types.find((authType) => {
      const typeId = typeof authType === 'string' ? authType : authType.type;
      return typeId === 'api_key_header';
    });

    const headerField =
      typeof apiKeyHeaderAuth !== 'string' && apiKeyHeaderAuth?.defaults?.headerField
        ? String(apiKeyHeaderAuth.defaults.headerField)
        : 'ApiKey'; // default fallback

    secrets.authType = 'api_key_header';
    secrets.apiKey = credentials;
    secrets.headerField = headerField;
  }

  return secrets;
}

/**
 * Builds the secrets object for an MCP connector based on its config
 * @param config - The MCP connector configuration
 * @param credentials - The authentication credentials
 * @returns The secrets object to pass to the actions client
 */
function buildSecretsFromMCPConnectorConfig(
  config: MCPConnectorConfig,
  credentials: string
): ConnectorSecrets {
  const secrets: ConnectorSecrets = {};

  const authType = config.authType || 'bearer'; // Default to bearer if not specified

  switch (authType) {
    case 'bearer':
      secrets.token = credentials;
      break;
    case 'apiKey': {
      secrets.apiKey = credentials;
      if (config.apiKeyHeaderName) {
        secrets.secretHeaders = {
          [config.apiKeyHeaderName]: credentials,
        };
      }
      break;
    }
    case 'basic': {
      // credentials is in the format "username:password"
      secrets.user = credentials.split(':')[0];
      secrets.password = credentials.split(':')[1];
      break;
    }
  }
  return secrets;
}

async function importMcpTools(
  registry: ToolRegistry,
  actions: ActionsPluginStart,
  request: KibanaRequest,
  connectorId: string,
  toolNames: string[],
  name: string,
  logger: Logger
): Promise<string[]> {
  if (toolNames.length === 0) {
    return [];
  }

  const mcpTools = await getNamedMcpTools({
    actions,
    request,
    connectorId,
    toolNames,
    logger,
  });

  if (mcpTools === undefined) {
    throw new Error(`No imported connector tools found for ${name}`);
  }

  let importedToolIds: string[] = [];
  try {
    if (mcpTools && mcpTools.length > 0) {
      const { results } = await bulkCreateMcpTools({
        registry,
        actions,
        request,
        connectorId,
        tools: mcpTools,
        namespace: name,
      });
      importedToolIds = results.map((result) => result.toolId);
      logger.info(`Imported tools for Data Source '${name}': ${JSON.stringify(importedToolIds)}`);
    }
  } catch (error) {
    throw new Error(`Error bulk importing MCP tools for ${name}: ${error}`);
  }
  return importedToolIds;
}

export const createStackConnector = async (
  registry: ToolRegistry,
  actions: ActionsPluginStart,
  request: KibanaRequest,
  stackConnectorConfig: StackConnectorConfig,
  name: string,
  toolIds: string[],
  credentials: string,
  logger: Logger
) => {
  const actionsClient = await actions.getActionsClientWithRequest(request);
  const connectorType = stackConnectorConfig.type;
  let secrets: ConnectorSecrets;
  let connectorConfig = {};

  if (connectorType === '.mcp') {
    const mcpConnectorConfig = stackConnectorConfig.config as MCPConnectorConfig;
    connectorConfig = mcpConnectorConfig;
    secrets = buildSecretsFromMCPConnectorConfig(mcpConnectorConfig, credentials);
  } else {
    secrets = buildSecretsFromConnectorSpec(connectorType, credentials);
  }

  const stackConnector: ActionResult = await actionsClient.create({
    action: {
      name: `${connectorType} stack connector for data connector '${name}'`,
      actionTypeId: connectorType,
      config: connectorConfig,
      secrets,
    },
  });

  if (connectorType === '.mcp' && stackConnectorConfig.importedTools) {
    const importedToolIds = await importMcpTools(
      registry,
      actions,
      request,
      stackConnector.id,
      stackConnectorConfig.importedTools,
      name,
      logger
    );
    toolIds.push(...importedToolIds);
  }
  return stackConnector;
};
