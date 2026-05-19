import type { Readable } from 'stream';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ResponseHeaders } from '@kbn/core-http-server';
import type { AgentDiagnostics } from '../../../common/types/models';
import type { DeleteAgentUploadResponse } from '../../../common/types';
export declare function getAgentUploads(esClient: ElasticsearchClient, agentId: string): Promise<AgentDiagnostics[]>;
export declare function getAgentUploadFile(esClient: ElasticsearchClient, id: string, fileName: string): Promise<{
    body: Readable;
    headers: ResponseHeaders;
}>;
export declare function deleteAgentUploadFile(esClient: ElasticsearchClient, id: string): Promise<DeleteAgentUploadResponse>;
export declare function getDownloadHeadersForFile(fileName: string): ResponseHeaders;
