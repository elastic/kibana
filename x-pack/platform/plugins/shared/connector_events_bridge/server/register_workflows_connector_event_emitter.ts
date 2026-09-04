/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { asSpaceId } from '@kbn/core-spaces-common';
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
 * Builds a momentary space-scoped fake request for getClient.
 */
export function registerWorkflowsConnectorEventEmitter({
  actions,
  getWorkflowsExtensionsStart,
}: {
  actions: ActionsPluginSetupContract;
  getWorkflowsExtensionsStart: () => Promise<WorkflowsExtensionsServerPluginStart | undefined>;
}): void {
  const emitter: ConnectorEventEmitter = {
    emit: async ({ eventId, payload, spaceId, connectorId, connectorTypeId, correlationKey }) => {
      const workflowsExtensions = await getWorkflowsExtensionsStart();
      if (!workflowsExtensions) {
        emitFailureCount += 1;
        throw new Error(
          `Workflows extensions unavailable; dropping connector event ${eventId} for connector ${connectorId} space ${spaceId}`
        );
      }

      // Momentary attribution request — space only.
      const fakeRequest = kibanaRequestFactory({
        headers: {},
        spaceId: asSpaceId(spaceId),
      });

      const enriched: Record<string, unknown> = {
        ...payload,
        connectorId,
        connectorTypeId,
        spaceId,
        ...(correlationKey !== undefined ? { correlationKey } : {}),
      };

      try {
        const client = await workflowsExtensions.getClient(fakeRequest);
        await client.emitEvent(eventId, enriched);
      } catch (error) {
        emitFailureCount += 1;
        throw error;
      }
    },
  };

  actions.registerConnectorEventEmitter(emitter);
}
