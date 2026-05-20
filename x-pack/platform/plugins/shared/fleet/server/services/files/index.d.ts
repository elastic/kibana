import type { ElasticsearchClient } from '@kbn/core/server';
import type { SearchHit, UpdateByQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import type { FileStatus } from '@kbn/files-plugin/common/types';
/**
 * Gets files with given status from the files metadata index. Includes both files
 * `tohost` and files `fromhost`
 *
 * @param esClient
 * @param abortController
 * @param status
 */
export declare function getFilesByStatus(esClient: ElasticsearchClient, abortController: AbortController, status?: FileStatus): Promise<SearchHit[]>;
interface FileIdsByIndex {
    [index: string]: Set<string>;
}
/**
 * Returns subset of fileIds that don't have any file chunks
 *
 * @param esClient
 * @param abortController
 * @param files
 */
export declare function fileIdsWithoutChunksByIndex(esClient: ElasticsearchClient, abortController: AbortController, files: SearchHit[]): Promise<{
    fileIdsByIndex: FileIdsByIndex;
    allFileIds: Set<string>;
}>;
/**
 * Updates given files to provided status
 *
 * @param esClient
 * @param abortController
 * @param fileIdsByIndex
 * @param status
 */
export declare function updateFilesStatus(esClient: ElasticsearchClient, abortController: AbortController | undefined, fileIdsByIndex: FileIdsByIndex, status: FileStatus): Promise<UpdateByQueryResponse[]>;
export {};
