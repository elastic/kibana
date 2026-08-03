import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ZipArchive } from '../utils/zip_archive';
export declare const populateIndex: ({ esClient, indexName, manifestVersion, archive, log, inferenceId, }: {
    esClient: ElasticsearchClient;
    indexName: string;
    manifestVersion: string;
    archive: ZipArchive;
    log: Logger;
    inferenceId?: string;
}) => Promise<void>;
