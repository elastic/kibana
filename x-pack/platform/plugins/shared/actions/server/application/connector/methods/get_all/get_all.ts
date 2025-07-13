/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Get all actions with in-memory connectors
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import type { AuditLogger } from '@kbn/security-plugin-types-server';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { omit } from 'lodash';
import type { InMemoryConnector } from '../../../..';
import type { SavedObjectClientForFind } from '../../../../data/connector/types/params';
import { connectorWithExtraFindDataSchema } from '../../schemas';
import { findConnectorsSo, searchConnectorsSo } from '../../../../data/connector';
import type { GetAllParams, InjectExtraFindDataParams } from './types';
import { ConnectorAuditAction, connectorAuditEvent } from '../../../../lib/audit_events';
import { connectorFromSavedObject, isConnectorDeprecated } from '../../lib';
import type { ConnectorWithExtraFindData, ConnectorWithDecryptedSecrets } from '../../types';
import type { GetAllUnsecuredParams, GetByIdsWithSecretsUnsecuredParams } from './types/params';
import { RawAction } from '@kbn/actions-plugin/server/types';

interface GetAllHelperOpts {
  auditLogger?: AuditLogger;
  esClient: ElasticsearchClient;
  inMemoryConnectors: InMemoryConnector[];
  kibanaIndices: string[];
  logger: Logger;
  namespace?: string;
  connectorIdsFilter?: string[];
  savedObjectsClient: SavedObjectClientForFind;
}

export async function getAll({
  context,
  includeSystemActions = false,
}: GetAllParams): Promise<ConnectorWithExtraFindData[]> {
  try {
    await context.authorization.ensureAuthorized({ operation: 'get' });
  } catch (error) {
    context.auditLogger?.log(
      connectorAuditEvent({
        action: ConnectorAuditAction.FIND,
        error,
      })
    );
    throw error;
  }

  return await getAllHelper({
    auditLogger: context.auditLogger,
    esClient: context.scopedClusterClient.asInternalUser,
    inMemoryConnectors: includeSystemActions
      ? context.inMemoryConnectors
      : context.inMemoryConnectors.filter((connector) => !connector.isSystemAction),
    kibanaIndices: context.kibanaIndices,
    logger: context.logger,
    savedObjectsClient: context.unsecuredSavedObjectsClient,
  });
}

export async function getAllUnsecured({
  esClient,
  inMemoryConnectors,
  internalSavedObjectsRepository,
  kibanaIndices,
  logger,
  spaceId,
}: GetAllUnsecuredParams): Promise<ConnectorWithExtraFindData[]> {
  const namespace = spaceId && spaceId !== 'default' ? spaceId : undefined;

  return await getAllHelper({
    esClient,
    // Unsecured execution does not currently support system actions so we filter them out
    inMemoryConnectors: inMemoryConnectors.filter((connector) => !connector.isSystemAction),
    kibanaIndices,
    logger,
    namespace,
    savedObjectsClient: internalSavedObjectsRepository,
  });
}

export async function getByIdsWithSecretsDecryptedUnsecured({
  esClient,
  encryptedSavedObjectsClient,
  inMemoryConnectors,
  spaceId,
  connectorIds,
}: GetByIdsWithSecretsUnsecuredParams): Promise<ConnectorWithDecryptedSecrets[]> {
  const namespace = spaceId && spaceId !== 'default' ? spaceId : undefined;
  const connectorIdsSet = new Set(connectorIds);
  const savedObjectsActions: ConnectorWithDecryptedSecrets[] = [];
  const ramainingConnectorIdsForFetch = [...connectorIds];
  const batchSize = 4; // don't know what value to use here, picked a random one

  while (ramainingConnectorIdsForFetch.length) {
    const connectorsWithSecrets = await Promise.all(
      ramainingConnectorIdsForFetch.splice(0, batchSize).map((connectorId) =>
        encryptedSavedObjectsClient
          .getDecryptedAsInternalUser<RawAction>('action', connectorId, {
            namespace: namespace === 'default' ? undefined : namespace,
          })
          .then(
            (rawAction) =>
              ({
                ...connectorFromSavedObject(rawAction, isConnectorDeprecated(rawAction.attributes)),
                secrets: rawAction.attributes.secrets,
              } as ConnectorWithDecryptedSecrets)
          )
      )
    );
    savedObjectsActions.push(...connectorsWithSecrets);
  }

  const mergedResult = [
    ...savedObjectsActions,
    ...(await filterInferenceConnectors(esClient, inMemoryConnectors))
      .filter((connector) => connectorIdsSet.has(connector.id))
      .map((connector) => {
        return {
          id: connector.id,
          actionTypeId: connector.actionTypeId,
          name: connector.name,
          isPreconfigured: connector.isPreconfigured,
          isDeprecated: isConnectorDeprecated(connector),
          isSystemAction: connector.isSystemAction,
          ...(connector.exposeConfig ? { config: connector.config } : {}),
          secrets: undefined,
        } as ConnectorWithDecryptedSecrets;
      }),
  ].sort((a, b) => a.name.localeCompare(b.name));

  return mergedResult;
}

async function getAllHelper({
  auditLogger,
  esClient,
  inMemoryConnectors,
  kibanaIndices,
  logger,
  namespace,
  savedObjectsClient,
}: GetAllHelperOpts): Promise<ConnectorWithExtraFindData[]> {
  const savedObjectsActions = (
    await findConnectorsSo({ savedObjectsClient, namespace })
  ).saved_objects.map((rawAction) => {
    const connector = connectorFromSavedObject(
      rawAction,
      isConnectorDeprecated(rawAction.attributes)
    );
    return omit(connector, 'secrets');
  });

  if (auditLogger) {
    savedObjectsActions.forEach(({ id }) =>
      auditLogger.log(
        connectorAuditEvent({
          action: ConnectorAuditAction.FIND,
          savedObject: { type: 'action', id },
        })
      )
    );
  }

  const mergedResult = [
    ...savedObjectsActions,
    ...(await filterInferenceConnectors(esClient, inMemoryConnectors)).map((connector) => {
      return {
        id: connector.id,
        actionTypeId: connector.actionTypeId,
        name: connector.name,
        isPreconfigured: connector.isPreconfigured,
        isDeprecated: isConnectorDeprecated(connector),
        isSystemAction: connector.isSystemAction,
        ...(connector.exposeConfig ? { config: connector.config } : {}),
      };
    }),
  ].sort((a, b) => a.name.localeCompare(b.name));

  const connectors = await injectExtraFindData({
    kibanaIndices,
    esClient,
    connectors: mergedResult,
  });

  validateConnectors(connectors, logger);

  return connectors;
}

const validateConnectors = (connectors: ConnectorWithExtraFindData[], logger: Logger) => {
  connectors.forEach((connector) => {
    // Try to validate the connectors, but don't throw.
    try {
      connectorWithExtraFindDataSchema.validate(connector);
    } catch (e) {
      logger.warn(`Error validating connector: ${connector.id}, ${e}`);
    }
  });
};

export async function getAllSystemConnectors({
  context,
}: {
  context: GetAllParams['context'];
}): Promise<ConnectorWithExtraFindData[]> {
  try {
    await context.authorization.ensureAuthorized({ operation: 'get' });
  } catch (error) {
    context.auditLogger?.log(
      connectorAuditEvent({
        action: ConnectorAuditAction.FIND,
        error,
      })
    );

    throw error;
  }

  const systemConnectors = context.inMemoryConnectors.filter(
    (connector) => connector.isSystemAction
  );

  const transformedSystemConnectors = systemConnectors
    .map((systemConnector) => ({
      id: systemConnector.id,
      actionTypeId: systemConnector.actionTypeId,
      name: systemConnector.name,
      isPreconfigured: systemConnector.isPreconfigured,
      isDeprecated: isConnectorDeprecated(systemConnector),
      isSystemAction: systemConnector.isSystemAction,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const connectors = await injectExtraFindData({
    kibanaIndices: context.kibanaIndices,
    esClient: context.scopedClusterClient.asInternalUser,
    connectors: transformedSystemConnectors,
  });

  validateConnectors(connectors, context.logger);

  return connectors;
}

async function injectExtraFindData({
  kibanaIndices,
  esClient,
  connectors,
}: InjectExtraFindDataParams): Promise<ConnectorWithExtraFindData[]> {
  const aggs: Record<string, estypes.AggregationsAggregationContainer> = {};
  for (const connector of connectors) {
    aggs[connector.id] = {
      filter: {
        bool: {
          must: {
            nested: {
              path: 'references',
              query: {
                bool: {
                  filter: {
                    bool: {
                      must: [
                        {
                          term: {
                            'references.id': connector.id,
                          },
                        },
                        {
                          term: {
                            'references.type': 'action',
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
  }

  const aggregationResult = await searchConnectorsSo({ esClient, kibanaIndices, aggs });

  return connectors.map((connector) => ({
    ...connector,
    // @ts-expect-error aggegation type is not specified
    referencedByCount: aggregationResult.aggregations[connector.id].doc_count,
  }));
}

/**
 * Filters out inference connectors that do not have an endpoint.
 * It requires a connector config in order to retrieve the inference id.
 *
 * @param esClient
 * @param connectors
 * @returns
 */
export async function filterInferenceConnectors(
  esClient: ElasticsearchClient,
  connectors: InMemoryConnector[]
): Promise<InMemoryConnector[]> {
  let result = connectors;

  if (result.some((connector) => connector.actionTypeId === '.inference')) {
    try {
      // Get all inference endpoints to filter out inference connector without endpoints
      const inferenceEndpoints = await esClient.inference.get();
      result = result.filter((connector) => {
        if (connector.actionTypeId !== '.inference') return true;

        const inferenceEndpoint = inferenceEndpoints.endpoints.find(
          (endpoint) => endpoint.inference_id === connector.config?.inferenceId
        );
        return inferenceEndpoint !== undefined;
      });
    } catch (e) {
      // If we can't get the inference endpoints, we just return all connectors
    }
  }

  return result;
}
