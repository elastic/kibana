import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { NewPackagePolicy, PackagePolicy } from '../../types';
export declare function handleExperimentalDatastreamFeatureOptIn({ soClient, esClient, packagePolicy, }: {
    soClient: SavedObjectsClientContract;
    esClient: ElasticsearchClient;
    packagePolicy: PackagePolicy | NewPackagePolicy;
}): Promise<void>;
