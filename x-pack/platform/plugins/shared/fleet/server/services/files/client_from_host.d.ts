import type { Readable } from 'stream';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import type { FileClient } from '@kbn/files-plugin/server';
import type { File } from '@kbn/files-plugin/common';
import type { FileCustomMeta, FleetFile, FleetFromHostFileClientInterface, HostUploadedFileMetadata } from './types';
/**
 * Public interface for interacting with Files stored in Fleet indexes. Service is consumed via
 * the Fleet `Plugin#start()` interface - {@link FleetStartContract}
 */
export declare class FleetFromHostFilesClient implements FleetFromHostFileClientInterface {
    protected esClient: ElasticsearchClient;
    protected logger: Logger;
    protected fileMetaIndex: string;
    protected fileDataIndex: string;
    protected esFileClient: FileClient;
    constructor(esClient: ElasticsearchClient, logger: Logger, fileMetaIndex: string, fileDataIndex: string, maxSizeBytes?: number);
    get(fileId: string): Promise<FleetFile>;
    doesFileHaveData(fileId: string): Promise<boolean>;
    download(fileId: string): Promise<{
        stream: Readable;
        fileName: string;
        mimeType?: string;
    }>;
    /**
     * Will check if the file actually has data (chunks) if the `status` is `READY`, and if not, it
     * will set (mutate) the `status` to `DELETED`.
     * Covers edge case where ILM could have deleted the file data, but the background task has not
     * yet adjusted the file's meta to reflect that state.
     * @param file
     * @protected
     */
    protected adjustFileStatusIfNeeded(file: FleetFile): Promise<void>;
    protected mapIndexedDocToFleetFile(fileDoc: estypes.SearchHit<HostUploadedFileMetadata> | File<FileCustomMeta>): FleetFile;
}
