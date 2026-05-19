import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { LogSourcesService } from '../../../common/services/log_sources_service/types';
import type { RegisterServicesParams } from '../register_services';
export declare function createLogSourcesServiceFactory(params: RegisterServicesParams): {
    getLogSourcesService(savedObjectsClient: SavedObjectsClientContract): Promise<LogSourcesService>;
    getScopedLogSourcesService(request: KibanaRequest): Promise<LogSourcesService>;
};
