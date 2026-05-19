import type { ElasticsearchClient } from '@kbn/core/server';
import type { NewFleetServerHost, FleetServerHost } from '../../../common/types';
import type { SecretReference } from '../../types';
export declare function extractAndWriteFleetServerHostsSecrets(opts: {
    fleetServerHost: NewFleetServerHost;
    esClient: ElasticsearchClient;
    secretHashes?: Record<string, any>;
}): Promise<{
    fleetServerHost: NewFleetServerHost;
    secretReferences: SecretReference[];
}>;
export declare function extractAndUpdateFleetServerHostsSecrets(opts: {
    oldFleetServerHost: NewFleetServerHost;
    fleetServerHostUpdate: Partial<NewFleetServerHost>;
    esClient: ElasticsearchClient;
    secretHashes?: Record<string, any>;
}): Promise<{
    fleetServerHostUpdate: Partial<NewFleetServerHost>;
    secretReferences: SecretReference[];
    secretsToDelete: SecretReference[];
}>;
export declare function deleteFleetServerHostsSecrets(opts: {
    fleetServerHost: NewFleetServerHost;
    esClient: ElasticsearchClient;
}): Promise<void>;
export declare function getFleetServerHostsSecretReferences(fleetServerHost: FleetServerHost): SecretReference[];
