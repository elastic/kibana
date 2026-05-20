import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { PackageClient } from '../../services';
export declare const getFollowerIndex: (esClient: ElasticsearchClient, abortController: AbortController) => Promise<string | undefined>;
export declare const syncIntegrationsOnRemote: (esClient: ElasticsearchClient, soClient: SavedObjectsClientContract, packageClient: PackageClient, abortController: AbortController, logger: Logger) => Promise<void>;
