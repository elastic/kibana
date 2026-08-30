/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
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
 * Temporary until execution identity (https://github.com/elastic/security-team/issues/18797).
 * Task Manager clones the emit request and requires `Authorization: ApiKey`.
 * Mint a short-lived kibana_system key here so Workflows never sees a keyless
 * fake request.
 */
const createTemporaryScheduleRequest = async ({
  esClient,
  spaceId,
  connectorId,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  connectorId: string;
}) => {
  const created = await esClient.security.createApiKey({
    name: `workflows-connector-event-temp-${connectorId}-${randomUUID()}`,
    expiration: '1h',
    metadata: {
      managed: true,
      purpose: 'workflows-connector-event-temp',
    },
    role_descriptors: {},
  });

  if (!created?.id || !created.api_key) {
    throw new Error('Failed to create temporary API key for connector-event workflow schedule');
  }

  return {
    mintedApiKeyId: created.id,
    request: kibanaRequestFactory({
      headers: {
        authorization: `ApiKey ${Buffer.from(`${created.id}:${created.api_key}`).toString(
          'base64'
        )}`,
      },
      spaceId: asSpaceId(spaceId),
    }),
  };
};

const invalidateTemporaryScheduleKey = async ({
  esClient,
  apiKeyId,
  logger,
}: {
  esClient: ElasticsearchClient;
  apiKeyId: string;
  logger: Logger;
}): Promise<void> => {
  try {
    await esClient.security.invalidateApiKey({ ids: [apiKeyId] });
  } catch (error) {
    logger.warn(
      `Failed to invalidate temporary connector-event API key ${apiKeyId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

/**
 * Registers the Phase 1 Workflows emitter on the Actions inbound hub.
 * Builds a momentary space-scoped fake request that already carries a
 * disposable kibana_system API key (temporary until execution identity lands).
 */
export function registerWorkflowsConnectorEventEmitter({
  actions,
  getWorkflowsExtensionsStart,
  getInternalEsClient,
  logger,
}: {
  actions: ActionsPluginSetupContract;
  getWorkflowsExtensionsStart: () => Promise<WorkflowsExtensionsServerPluginStart | undefined>;
  getInternalEsClient: () => Promise<ElasticsearchClient>;
  logger: Logger;
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

      let mintedApiKeyId: string | undefined;
      let esClient: ElasticsearchClient | undefined;

      try {
        esClient = await getInternalEsClient();
        const { request, mintedApiKeyId: apiKeyId } = await createTemporaryScheduleRequest({
          esClient,
          spaceId,
          connectorId,
        });
        mintedApiKeyId = apiKeyId;

        const enriched: Record<string, unknown> = {
          ...payload,
          connectorId,
          connectorTypeId,
          spaceId,
          ...(correlationKey !== undefined ? { correlationKey } : {}),
        };

        const client = await workflowsExtensions.getClient(request);
        await client.emitEvent(eventId, enriched);
      } catch (error) {
        emitFailureCount += 1;
        throw error;
      } finally {
        if (mintedApiKeyId && esClient) {
          await invalidateTemporaryScheduleKey({
            esClient,
            apiKeyId: mintedApiKeyId,
            logger,
          });
        }
      }
    },
  };

  actions.registerConnectorEventEmitter(emitter);
}
