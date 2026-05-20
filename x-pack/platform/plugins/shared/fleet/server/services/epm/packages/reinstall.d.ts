import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { Installation } from '../../../types';
export declare function reinstallPackageForInstallation({ soClient, esClient, installation, }: {
    soClient: SavedObjectsClientContract;
    esClient: ElasticsearchClient;
    installation: Installation;
}): Promise<import("../../../types").InstallResult>;
