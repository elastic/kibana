/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import {
  getConnectorSpec,
  SANDBOX_CLI_MINT_TOKEN_ACTION,
  SANDBOX_CLI_MINT_TOKEN_OPTIONS_ACTION,
  SANDBOX_CLI_REVOKE_TOKEN_ACTION,
  type SandboxCliToken,
} from '@kbn/connector-specs';

type ScopedActionsClient = Awaited<ReturnType<ActionsPluginStart['getActionsClientWithRequest']>>;

export interface SandboxCliCredentialRequest {
  connectorId?: string;
  actionTypeId?: string;
  input?: Record<string, unknown>;
  label?: string;
}

export interface ResolvedSandboxCliCredential {
  connectorId: string;
  connectorName: string;
  connectorDisplayName: string;
  actionTypeId: string;
  token: SandboxCliToken;
  label?: string;
}

export interface SandboxCliConnectorOption {
  connectorId: string;
  name: string;
  displayName: string;
  actionTypeId: string;
  description: string;
  skill: string;
  options?: unknown;
}

const isSandboxCliToken = (value: unknown): value is SandboxCliToken => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  return typeof (value as Record<string, unknown>).source === 'string';
};

export class SandboxCliCredentialResolver {
  constructor(
    private readonly getActions: () => Promise<ActionsPluginStart>,
    private readonly logger: Logger
  ) {}

  async listAvailable({
    request,
    allowedConnectors,
  }: {
    request: KibanaRequest;
    allowedConnectors?: string[];
  }): Promise<SandboxCliConnectorOption[]> {
    const actions = await this.getActions();
    const actionsClient = await actions.getActionsClientWithRequest(request);
    const connectors = await this.resolveSandboxCliConnectors(actionsClient, { allowedConnectors });

    return Promise.all(
      connectors.map(async (connector) => {
        const spec = getConnectorSpec(connector.actionTypeId);
        let options: unknown;
        const optionsResult = await actionsClient
          .execute({
            actionId: connector.id,
            params: {
              subAction: SANDBOX_CLI_MINT_TOKEN_OPTIONS_ACTION,
              subActionParams: {},
            },
          })
          .catch((error) => ({
            status: 'error' as const,
            message: error instanceof Error ? error.message : String(error),
          }));
        if (optionsResult.status === 'ok') {
          options = optionsResult.data;
        }

        return {
          connectorId: connector.id,
          name: connector.name,
          displayName: connector.displayName,
          actionTypeId: connector.actionTypeId,
          description: spec?.metadata.description ?? connector.actionTypeId,
          skill: spec?.sandboxCli?.skill ?? '',
          ...(options !== undefined ? { options } : {}),
        };
      })
    );
  }

  async resolveAll({
    request,
    allowedConnectors,
    requested,
    onDiagnostic,
  }: {
    request: KibanaRequest;
    allowedConnectors?: string[];
    requested: SandboxCliCredentialRequest[];
    onDiagnostic?: (message: string) => void;
  }): Promise<ResolvedSandboxCliCredential[]> {
    const resolved: ResolvedSandboxCliCredential[] = [];
    for (const credentialRequest of requested) {
      const credential = await this.resolveOne({
        request,
        allowedConnectors,
        requested: credentialRequest,
        onDiagnostic,
      });
      if (credential) {
        resolved.push(credential);
      }
    }
    return resolved;
  }

  private async resolveOne({
    request,
    allowedConnectors,
    requested,
    onDiagnostic,
  }: {
    request: KibanaRequest;
    allowedConnectors?: string[];
    requested: SandboxCliCredentialRequest;
    onDiagnostic?: (message: string) => void;
  }): Promise<ResolvedSandboxCliCredential | undefined> {
    try {
      const actions = await this.getActions();
      const actionsClient = await actions.getActionsClientWithRequest(request);
      const connectors = await this.resolveSandboxCliConnectors(actionsClient, {
        allowedConnectors,
        connectorId: requested.connectorId,
        actionTypeId: requested.actionTypeId,
      });

      if (connectors.length === 0) {
        onDiagnostic?.(
          `No accessible sandbox CLI connector was found for ${
            requested.actionTypeId ?? requested.connectorId ?? requested.label ?? 'request'
          }`
        );
      }

      for (const connector of connectors) {
        const executeResult = await actionsClient.execute({
          actionId: connector.id,
          params: {
            subAction: SANDBOX_CLI_MINT_TOKEN_ACTION,
            subActionParams: requested.input ?? {},
          },
        });

        if (executeResult.status === 'error') {
          onDiagnostic?.(
            `Sandbox CLI connector ${connector.id} failed to mint credentials: ${
              executeResult.message ?? 'unknown error'
            }`
          );
          continue;
        }

        if (!isSandboxCliToken(executeResult.data)) {
          onDiagnostic?.(`Sandbox CLI connector ${connector.id} returned an invalid token payload`);
          continue;
        }

        this.logger.info(
          `Resolved sandbox CLI credentials from connector ${connector.id} (${connector.actionTypeId})`
        );
        return {
          connectorId: connector.id,
          connectorName: connector.name,
          connectorDisplayName: connector.displayName,
          actionTypeId: connector.actionTypeId,
          token: executeResult.data,
          label: requested.label,
        };
      }
    } catch (error) {
      this.logger.warn(`Failed to resolve sandbox CLI credentials: ${(error as Error).message}`);
      onDiagnostic?.(`Failed to resolve sandbox CLI credentials: ${(error as Error).message}`);
    }

    return undefined;
  }

  async revokeAll({
    request,
    credentials,
  }: {
    request: KibanaRequest;
    credentials: ResolvedSandboxCliCredential[];
  }): Promise<void> {
    if (credentials.length === 0) {
      return;
    }
    const actions = await this.getActions();
    const actionsClient = await actions.getActionsClientWithRequest(request);
    await Promise.all(
      credentials.map(async (credential) => {
        const result = await actionsClient.execute({
          actionId: credential.connectorId,
          params: {
            subAction: SANDBOX_CLI_REVOKE_TOKEN_ACTION,
            subActionParams: credential.token,
          },
        });
        if (result.status === 'error') {
          this.logger.warn(
            `Sandbox CLI connector ${credential.connectorId} failed to revoke credentials: ${
              result.message ?? 'unknown error'
            }`
          );
        }
      })
    );
  }

  private async resolveSandboxCliConnectors(
    actionsClient: ScopedActionsClient,
    {
      allowedConnectors,
      connectorId,
      actionTypeId,
    }: {
      allowedConnectors?: string[];
      connectorId?: string;
      actionTypeId?: string;
    }
  ): Promise<Array<{ id: string; name: string; displayName: string; actionTypeId: string }>> {
    if (connectorId) {
      if (allowedConnectors && !allowedConnectors.includes(connectorId)) {
        return [];
      }
      const connector = await actionsClient.get({ id: connectorId }).catch(() => undefined);
      if (!connector || (actionTypeId && connector.actionTypeId !== actionTypeId)) {
        return [];
      }
      const spec = getConnectorSpec(connector.actionTypeId);
      return spec?.sandboxCli
        ? [
            {
              id: connector.id,
              name: connector.name,
              displayName: spec.metadata.displayName,
              actionTypeId: connector.actionTypeId,
            },
          ]
        : [];
    }

    const connectors =
      allowedConnectors && allowedConnectors.length > 0
        ? await Promise.all(
            allowedConnectors.map((id) => actionsClient.get({ id }).catch(() => undefined))
          )
        : await actionsClient.getAll();

    const sandboxCliConnectors: Array<{
      id: string;
      name: string;
      displayName: string;
      actionTypeId: string;
    }> = [];
    for (const connector of connectors) {
      const spec = connector ? getConnectorSpec(connector.actionTypeId) : undefined;
      if (
        connector &&
        (!actionTypeId || connector.actionTypeId === actionTypeId) &&
        spec?.sandboxCli
      ) {
        sandboxCliConnectors.push({
          id: connector.id,
          name: connector.name,
          displayName: spec.metadata.displayName,
          actionTypeId: connector.actionTypeId,
        });
      }
    }
    return sandboxCliConnectors;
  }
}
