/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';

const GCP_CLI_ACTION_TYPE_ID = '.gcp_cli';
const MINT_SANDBOX_TOKEN_SUB_ACTION = 'mintSandboxToken';

type ScopedActionsClient = Awaited<ReturnType<ActionsPluginStart['getActionsClientWithRequest']>>;

export type GcpCliAccess = 'read' | 'write';

export interface GcpCliCredentialRequest {
  connectorId?: string;
  projectId?: string;
  access?: GcpCliAccess;
  services?: string[];
  regions?: string[];
}

export interface GcpCliCredentials {
  accessToken: string;
  expiresAt: number;
  projectId: string;
  connectorId: string;
  targetServiceAccount: string;
  source: 'gcp_cli_connector_token';
}

const isGcpCliCredentials = (value: unknown): value is GcpCliCredentials => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.accessToken === 'string' &&
    typeof record.expiresAt === 'number' &&
    typeof record.projectId === 'string' &&
    typeof record.targetServiceAccount === 'string' &&
    record.source === 'gcp_cli_connector_token'
  );
};

/**
 * Resolves a generic Google Cloud CLI connector into a short-lived, run-scoped sandbox access
 * token by invoking the connector-owned mint action. Provider-specific GCP IAM logic stays in
 * the connector; this class only selects an allowed connector and adapts the result for the
 * OpenCode runtime.
 */
export class GcpCliCredentialResolver {
  constructor(
    private readonly getActions: () => Promise<ActionsPluginStart>,
    private readonly logger: Logger
  ) {}

  async resolve({
    request,
    allowedConnectors,
    spaceId,
    requested,
    onDiagnostic,
  }: {
    request: KibanaRequest;
    allowedConnectors?: string[];
    spaceId?: string;
    requested: GcpCliCredentialRequest;
    onDiagnostic?: (message: string) => void;
  }): Promise<GcpCliCredentials | undefined> {
    try {
      const actions = await this.getActions();
      const actionsClient = await actions.getActionsClientWithRequest(request);
      const connectorIds = await this.resolveGcpCliConnectorIds(actionsClient, {
        allowedConnectors,
        connectorId: requested.connectorId,
      });
      if (connectorIds.length === 0) {
        onDiagnostic?.('No accessible Google Cloud CLI connector was found');
      }

      for (const connectorId of connectorIds) {
        const connector = await actionsClient.get({ id: connectorId }).catch(() => undefined);
        if (!connector || connector.actionTypeId !== GCP_CLI_ACTION_TYPE_ID) {
          continue;
        }

        const executeResult = await actionsClient.execute({
          actionId: connectorId,
          params: {
            subAction: MINT_SANDBOX_TOKEN_SUB_ACTION,
            subActionParams: requested,
          },
        });
        if (executeResult.status === 'error') {
          onDiagnostic?.(
            `Google Cloud CLI connector ${connectorId} failed to mint a token: ${
              executeResult.message ?? 'unknown error'
            }`
          );
          continue;
        }

        if (!isGcpCliCredentials(executeResult.data)) {
          onDiagnostic?.(
            `Google Cloud CLI connector ${connectorId} returned an invalid sandbox token response`
          );
          continue;
        }
        return { ...executeResult.data, connectorId };
      }
    } catch (error) {
      this.logger.warn(
        `Failed to resolve Google Cloud CLI connector credentials: ${(error as Error).message}`
      );
      onDiagnostic?.(
        `Failed to resolve Google Cloud CLI connector credentials: ${(error as Error).message}`
      );
    }

    return undefined;
  }

  private async resolveGcpCliConnectorIds(
    actionsClient: ScopedActionsClient,
    {
      allowedConnectors,
      connectorId,
    }: {
      allowedConnectors?: string[];
      connectorId?: string;
    }
  ): Promise<string[]> {
    if (connectorId) {
      return allowedConnectors && !allowedConnectors.includes(connectorId) ? [] : [connectorId];
    }

    if (allowedConnectors && allowedConnectors.length > 0) {
      return allowedConnectors;
    }

    const connectors = await actionsClient.getAll();
    return connectors
      .filter((connector) => connector.actionTypeId === GCP_CLI_ACTION_TYPE_ID)
      .map((connector) => connector.id);
  }
}
