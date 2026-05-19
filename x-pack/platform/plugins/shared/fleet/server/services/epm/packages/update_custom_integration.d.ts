import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { PackageSpecCategory } from '../../../../common/types';
export declare function updateCustomIntegration(esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, id: string, fields: {
    readMeData?: string;
    categories?: PackageSpecCategory[];
}): Promise<{
    version: string;
    status: import("../../../../common/types").InstallResultStatus | undefined;
}>;
export declare function incrementVersionAndUpdate(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, pkgName: string, data: {
    version: string;
    readme: string | undefined;
    categories: PackageSpecCategory[] | undefined;
}): Promise<import("../../../../common/types").InstallResult>;
