/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosInstance } from 'axios';
import type { ConnectorSpec } from '@kbn/connector-specs';
import type { ExecutorParams } from '../../sub_action_framework/types';
import type {
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
  ActionTypeExecutorResult as ConnectorTypeExecutorResult,
} from '../../types';
import type { ClientTypeRegistry } from '../../client_types';

type RecordUnknown = Record<string, unknown>;

export const generateExecutorFunction = ({
  actions,
  clientTypeRegistry,
  declaredClients,
}: {
  actions: ConnectorSpec['actions'];
  clientTypeRegistry: ClientTypeRegistry;
  declaredClients: Record<string, Record<string, unknown>>;
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
      authMode,
      profileUid,
    } = execOptions;
    const { subAction, subActionParams } = params as ExecutorParams;

    if (!actions[subAction]) {
      const errorMessage = `[Action][ExternalService] Unsupported subAction type ${subAction}.`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    const createdClients: Record<string, unknown> = {};
    for (const [clientId, clientConfig] of Object.entries(declaredClients)) {
      const clientType = clientTypeRegistry.get(clientId);
      createdClients[clientId] = await clientType.create({
        connectorId,
        secrets,
        config: config as RecordUnknown,
        additionalHeaders: globalAuthHeaders
          ? Object.fromEntries(
              Object.entries(globalAuthHeaders).filter(
                (entry): entry is [string, string] => typeof entry[1] === 'string'
              )
            )
          : undefined,
        connectorTokenClient,
        signal,
        authMode,
        profileUid,
        clientConfig,
      });
      if (clientType.connect) {
        await clientType.connect(createdClients[clientId]);
      }
    }

    try {
      const actionContext = {
        log: logger,
        client: createdClients.http as AxiosInstance,
        clients: createdClients,
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
      for (const [clientId, client] of Object.entries(createdClients)) {
        const clientType = clientTypeRegistry.get(clientId);
        if (clientType.disconnect && clientType.isConnected?.(client)) {
          try {
            await clientType.disconnect(client);
          } catch (disconnectError) {
            const errMsg =
              disconnectError instanceof Error ? disconnectError.message : String(disconnectError);
            logger.warn(
              `Failed to disconnect ${clientId} client for connector ${connectorId}: ${errMsg}`
            );
          }
        }
      }
    }
  };
