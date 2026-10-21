/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConnectorEventEmitter,
  PluginSetupContract as ActionsPluginSetupContract,
} from '@kbn/actions-plugin/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';

let emitFailureCount = 0;

/** Emit failures observed by this bridge process. */
export function getConnectorEventEmitFailureCount(): number {
  return emitFailureCount;
}

/** @internal */
export function resetConnectorEventEmitFailureCountForTests(): void {
  emitFailureCount = 0;
}

/**
 * Registers the Phase 1 Workflows emitter on the Actions inbound hub.
 * Forwards the ingest-built last-saver request; never invents a space-only request.
 */
export function registerWorkflowsConnectorEventEmitter({
  actions,
  getWorkflowsExtensionsStart,
}: {
  actions: ActionsPluginSetupContract;
  getWorkflowsExtensionsStart: () => Promise<WorkflowsExtensionsServerPluginStart | undefined>;
}): void {
  const emitter: ConnectorEventEmitter = {
    emit: async ({
      eventId,
      payload,
      spaceId,
      connectorId,
      connectorTypeId,
      correlationKey,
      request,
    }) => {
      const workflowsExtensions = await getWorkflowsExtensionsStart();
      if (!workflowsExtensions) {
        emitFailureCount += 1;
        throw new Error(
          `Workflows extensions unavailable; dropping connector event ${eventId} for connector ${connectorId} space ${spaceId}`
        );
      }

      if (!request.headers.authorization) {
        emitFailureCount += 1;
        throw new Error(
          `Connector event emit requires an authenticated request; dropping event ${eventId} for connector ${connectorId} space ${spaceId}`
        );
      }

      const enriched: Record<string, unknown> = {
        ...payload,
        connectorId,
        connectorTypeId,
        spaceId,
        ...(correlationKey !== undefined ? { correlationKey } : {}),
      };

      try {
        const client = await workflowsExtensions.getClient(request);
        await client.emitEvent(eventId, enriched);
      } catch (error) {
        emitFailureCount += 1;
        throw error;
      }
    },
  };

  actions.registerConnectorEventEmitter(emitter);
}
