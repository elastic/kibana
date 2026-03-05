/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec, McpClientConfig } from '@kbn/connector-specs';
import type { McpClient } from '@kbn/mcp-client';
import type { ExecutorParams } from '../../sub_action_framework/types';
import type {
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
} from '../../types';
import type { GetAxiosInstanceWithAuthFn } from '../get_axios_instance';
import type { CreateMcpClientFn } from '../get_mcp_client';

type RecordUnknown = Record<string, unknown>;

export const generateExecutorFunction = ({
  actions,
  getAxiosInstanceWithAuth,
  mcp,
  createMcpClient,
}: {
  actions: ConnectorSpec['actions'];
  getAxiosInstanceWithAuth: GetAxiosInstanceWithAuthFn;
  mcp?: McpClientConfig;
  createMcpClient?: CreateMcpClientFn;
}) =>
  async function (
    execOptions: ConnectorTypeExecutorOptions<RecordUnknown, RecordUnknown, RecordUnknown>
  ): Promise<ConnectorTypeExecutorResult<unknown>> {
    const {
      actionId: connectorId,
      config,
      connectorTokenClient,
      globalAuthHeaders,
      params,
      secrets,
      logger,
      signal,
    } = execOptions;
    const { subAction, subActionParams } = params as ExecutorParams;

    const axiosInstance = await getAxiosInstanceWithAuth({
      connectorId,
      connectorTokenClient,
      additionalHeaders: globalAuthHeaders,
      secrets,
      signal,
    });

    if (!actions[subAction]) {
      const errorMessage = `[Action][ExternalService] Unsupported subAction type ${subAction}.`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    let mcpClient: McpClient | undefined;
    if (mcp && createMcpClient) {
      const url = (config as RecordUnknown)?.[mcp.urlField] as string | undefined;
      if (!url) {
        throw new Error(
          `MCP client requires a URL in config field "${mcp.urlField}" but none was provided.`
        );
      }
      mcpClient = await createMcpClient({
        connectorId,
        url,
        secrets,
        additionalHeaders: globalAuthHeaders,
        connectorTokenClient,
      });
      await mcpClient.connect();
    }

    try {
      const actionContext = {
        log: logger,
        client: axiosInstance,
        mcpClient,
        secrets,
        config,
      };

      let data = {};
      const res = await actions[subAction].handler(actionContext, subActionParams);

      if (res != null) {
        data = res;
      }

      return { status: 'ok', data, actionId: connectorId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`error on ${connectorId} event: ${errorMessage}`);
      return {
        status: 'error',
        message: errorMessage,
        actionId: connectorId,
      };
    } finally {
      if (mcpClient?.isConnected()) {
        try {
          await mcpClient.disconnect();
        } catch (disconnectError) {
          logger.warn(
            `Failed to disconnect MCP client for connector ${connectorId}: ${
              disconnectError instanceof Error ? disconnectError.message : String(disconnectError)
            }`
          );
        }
      }
    }
  };
