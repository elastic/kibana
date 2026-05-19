import type { Logger, SavedObjectsFindResponse, SavedObjectsUpdateResponse } from '@kbn/core/server';
import type { FindConnectorMappingsArgs, PostConnectorMappingsArgs, UpdateConnectorMappingsArgs } from './types';
import type { ConnectorMappingsSavedObjectTransformed, ConnectorMappingsAttributesTransformed } from '../../common/types/connector_mappings';
export declare class ConnectorMappingsService {
    private readonly log;
    constructor(log: Logger);
    find({ unsecuredSavedObjectsClient, options, }: FindConnectorMappingsArgs): Promise<SavedObjectsFindResponse<ConnectorMappingsAttributesTransformed>>;
    post({ unsecuredSavedObjectsClient, attributes, references, refresh, }: PostConnectorMappingsArgs): Promise<ConnectorMappingsSavedObjectTransformed>;
    update({ unsecuredSavedObjectsClient, mappingId, attributes, references, refresh, }: UpdateConnectorMappingsArgs): Promise<SavedObjectsUpdateResponse<ConnectorMappingsAttributesTransformed>>;
}
