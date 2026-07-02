import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import type { AuditLogger } from '@kbn/security-plugin/server';
import type { ActionTypeRegistry } from '../../../../../action_type_registry';
import type { InMemoryConnector } from '../../../../..';
import type { ActionsClientContext } from '../../../../../actions_client';
import type { Connector } from '../../../types';
export interface GetAllParams {
    includeSystemActions?: boolean;
    context: ActionsClientContext;
}
export interface GetAllUnsecuredParams {
    auditLogger?: AuditLogger;
    esClient: ElasticsearchClient;
    inMemoryConnectors: InMemoryConnector[];
    internalSavedObjectsRepository: ISavedObjectsRepository;
    kibanaIndices: string[];
    logger: Logger;
    spaceId: string;
    connectorTypeRegistry: ActionTypeRegistry;
}
export interface InjectExtraFindDataParams {
    kibanaIndices: string[];
    esClient: ElasticsearchClient;
    connectors: Connector[];
}
