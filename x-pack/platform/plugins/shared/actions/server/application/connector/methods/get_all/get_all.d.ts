import type { ElasticsearchClient } from '@kbn/core/server';
import type { InMemoryConnector } from '../../../..';
import type { GetAllParams } from './types';
import type { ConnectorWithExtraFindData } from '../../types';
import type { GetAllUnsecuredParams } from './types/params';
export declare function getAll({ context, includeSystemActions, }: GetAllParams): Promise<ConnectorWithExtraFindData[]>;
export declare function getAllUnsecured({ esClient, inMemoryConnectors, internalSavedObjectsRepository, kibanaIndices, logger, spaceId, connectorTypeRegistry, }: GetAllUnsecuredParams): Promise<ConnectorWithExtraFindData[]>;
export declare function getAllSystemConnectors({ context, }: {
    context: GetAllParams['context'];
}): Promise<ConnectorWithExtraFindData[]>;
/**
 * Filters out inference connectors that do not have an endpoint.
 * It requires a connector config in order to retrieve the inference id.
 *
 * @param esClient
 * @param connectors
 * @returns
 */
export declare function filterInferenceConnectors(esClient: ElasticsearchClient, connectors: InMemoryConnector[]): Promise<InMemoryConnector[]>;
