/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { SandboxSession } from '@kbn/sandbox-plugin/server';
import type { SandboxCallContext } from './tool_utils';
import { writeConnectorManifest } from './connector_manifest';

/**
 * Tracks per-conversation workspace state (connector IDs) and writes the connector manifest
 * to the sandbox whenever the session is reset or the allowed connector list changes.
 *
 * Create one instance per plugin lifecycle and share it across all sandbox tools.
 */
export const createSandboxWorkspaceManager = ({
  getDeps,
  logger,
}: {
  getDeps: () => { actions?: ActionsPluginStart };
  logger: Logger;
}) => {
  const lastConnectorIds = new Map<string, string>();

  return {
    async ensureWorkspaceReady({
      session,
      conversationId,
      callContext,
    }: {
      session: SandboxSession;
      conversationId: string;
      callContext: SandboxCallContext;
    }): Promise<void> {
      const currentKey = JSON.stringify([...callContext.allowedConnectorIds].sort());
      const lastKey = lastConnectorIds.get(conversationId);

      if (!session.isReset && lastKey === currentKey) return;

      lastConnectorIds.set(conversationId, currentKey);

      const { actions } = getDeps();
      const getActionsClient = actions
        ? (req: KibanaRequest) => actions.getActionsClientWithRequest(req)
        : undefined;

      await writeConnectorManifest({ session, callContext, getActionsClient, logger }).catch(
        (err: Error) => {
          logger.warn(`Connector manifest write failed for ${conversationId}: ${err.message}`);
        }
      );
    },
  };
};

export type SandboxWorkspaceManager = ReturnType<typeof createSandboxWorkspaceManager>;
