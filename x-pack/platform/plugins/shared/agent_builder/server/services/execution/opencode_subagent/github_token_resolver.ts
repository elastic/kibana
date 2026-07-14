/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { InMemoryConnector } from '@kbn/actions-plugin/server';

const GITHUB_ACTION_TYPE_ID = '.github';
const ACTION_SAVED_OBJECT_TYPE = 'action';

interface RawActionAttributes {
  actionTypeId: string;
  secrets: Record<string, unknown>;
}

/**
 * Resolves a GitHub connector's bearer PAT (decrypted, server-side) so the
 * executor can inject it into the sandbox's git for real clone/push operations.
 *
 * This is a deliberate, narrowly-scoped exception to the "secrets never enter the
 * sandbox" rule: raw git operations (unlike API calls brokered over the MCP
 * loopback) require a git-usable credential inside the pod. The token is injected
 * per-run and scrubbed afterwards by the runtime, and should be a short-lived,
 * minimally-scoped PAT.
 *
 * Only `bearer` (PAT) auth is supported here; OAuth `.github` connectors resolve
 * their live access token through a different path and are out of scope.
 */
export class GithubTokenResolver {
  constructor(
    private readonly getActions: () => Promise<ActionsPluginStart>,
    private readonly encryptedSavedObjects: EncryptedSavedObjectsPluginStart,
    private readonly logger: Logger
  ) {}

  /**
   * Given the connector ids allowed for this run, find the first `.github`
   * connector and return its bearer PAT. Returns `undefined` when there is no
   * GitHub connector, when it uses non-bearer auth, or when resolution fails —
   * callers should treat a missing token as "no git credentials for this run".
   */
  async resolve({
    request,
    allowedConnectors,
    spaceId,
  }: {
    request: KibanaRequest;
    allowedConnectors?: string[];
    spaceId?: string;
  }): Promise<{ token: string; connectorId: string } | undefined> {
    if (!allowedConnectors || allowedConnectors.length === 0) {
      return undefined;
    }

    try {
      const actions = await this.getActions();
      const actionsClient = await actions.getActionsClientWithRequest(request);

      for (const connectorId of allowedConnectors) {
        // `get` enforces the user's `actions:get` RBAC and gives us the type.
        const connector = await actionsClient.get({ id: connectorId }).catch(() => undefined);
        if (!connector || connector.actionTypeId !== GITHUB_ACTION_TYPE_ID) {
          continue;
        }

        const token = await this.readBearerToken({
          connectorId,
          isPreconfigured: actionsClient.isPreconfigured(connectorId),
          actions,
          spaceId,
        });
        if (token) {
          this.logger.info(
            `Resolved GitHub PAT from connector ${connectorId} for sandbox git operations`
          );
          return { token, connectorId };
        }
      }
    } catch (error) {
      this.logger.warn(
        `Failed to resolve GitHub connector token: ${(error as Error).message}. ` +
          `The sandbox will run without git credentials.`
      );
    }

    return undefined;
  }

  private async readBearerToken({
    connectorId,
    isPreconfigured,
    actions,
    spaceId,
  }: {
    connectorId: string;
    isPreconfigured: boolean;
    actions: ActionsPluginStart;
    spaceId?: string;
  }): Promise<string | undefined> {
    let secrets: Record<string, unknown> | undefined;

    if (isPreconfigured) {
      const inMemory = actions.inMemoryConnectors.find(
        (c: InMemoryConnector) => c.id === connectorId
      );
      secrets = inMemory?.secrets as Record<string, unknown> | undefined;
    } else {
      const esoClient = this.encryptedSavedObjects.getClient({
        includedHiddenTypes: [ACTION_SAVED_OBJECT_TYPE],
      });
      const namespace = spaceId && spaceId !== 'default' ? spaceId : undefined;
      const raw = await esoClient.getDecryptedAsInternalUser<RawActionAttributes>(
        ACTION_SAVED_OBJECT_TYPE,
        connectorId,
        namespace ? { namespace } : {}
      );
      secrets = raw.attributes.secrets;
    }

    if (secrets && secrets.authType === 'bearer' && typeof secrets.token === 'string') {
      return secrets.token;
    }
    return undefined;
  }
}
