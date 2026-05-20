import type { ElasticsearchClient, SavedObjectsClientContract, KibanaRequest } from '@kbn/core/server';
import type { BulkInstallResponse, IBulkInstallPackageError } from './install';
interface BulkInstallPackagesParams {
    savedObjectsClient: SavedObjectsClientContract;
    packagesToInstall: Array<string | {
        name: string;
        version?: string;
        prerelease?: boolean;
        skipDataStreamRollover?: boolean;
    }>;
    esClient: ElasticsearchClient;
    force?: boolean;
    spaceId: string;
    preferredSource?: 'registry' | 'bundled';
    prerelease?: boolean;
    request?: KibanaRequest;
    skipIfInstalled?: boolean;
}
export declare function bulkInstallPackages({ savedObjectsClient, packagesToInstall, esClient, spaceId, force, prerelease, request, skipIfInstalled, }: BulkInstallPackagesParams): Promise<BulkInstallResponse[]>;
export declare function isBulkInstallError(installResponse: any): installResponse is IBulkInstallPackageError;
export {};
