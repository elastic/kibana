import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
export interface ListIndexBasicInfo {
    index: string;
    docsCount: number;
}
export interface ListIndexDetailInfo extends ListIndexBasicInfo {
    status: string;
    health: string;
    uuid: string;
    primaries: number;
    replicas: number;
}
interface ListIndicesOptions {
    pattern?: string;
    includeHidden?: boolean;
    includeKibanaIndices?: boolean;
    listAllIfNoResults?: boolean;
    showDetails?: boolean;
    esClient: ElasticsearchClient;
}
type ListIndexResult<T extends ListIndicesOptions> = T['showDetails'] extends true ? ListIndexDetailInfo[] : ListIndexBasicInfo[];
export declare const listIndices: <const T extends ListIndicesOptions>({ pattern, includeHidden, includeKibanaIndices, listAllIfNoResults, showDetails, esClient, }: T) => Promise<ListIndexResult<T>>;
export {};
