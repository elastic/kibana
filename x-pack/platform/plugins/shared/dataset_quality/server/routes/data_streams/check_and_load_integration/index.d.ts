import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { PackageClient } from '@kbn/fleet-plugin/server';
import type { Logger } from '@kbn/logging';
import type { CheckAndLoadIntegrationResponse } from '../../../../common/api_types';
export declare function checkAndLoadIntegration({ esClient, packageClient, logger, dataStream, }: {
    esClient: ElasticsearchClient;
    packageClient: PackageClient;
    logger: Logger;
    dataStream: string;
}): Promise<CheckAndLoadIntegrationResponse>;
