import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { SecondaryAuthorizationHeader } from '../../../../../common/types/models/transform_api_key';
export declare function handleTransformReauthorizeAndStart({ esClient, savedObjectsClient, logger, pkgName, pkgVersion, transforms, secondaryAuth, username, }: {
    esClient: ElasticsearchClient;
    savedObjectsClient: SavedObjectsClientContract;
    logger: Logger;
    transforms: Array<{
        transformId: string;
    }>;
    pkgName: string;
    pkgVersion?: string;
    secondaryAuth?: SecondaryAuthorizationHeader;
    username?: string;
}): Promise<Array<{
    transformId: string;
    success: boolean;
    error: null | any;
}>>;
