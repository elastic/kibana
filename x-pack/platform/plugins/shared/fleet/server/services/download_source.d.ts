import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { DownloadSource, DownloadSourceBase } from '../types';
declare class DownloadSourceService {
    private get soClient();
    private get encryptedSoClient();
    get(id: string): Promise<DownloadSource>;
    list(): Promise<{
        items: DownloadSource[];
        total: number;
        page: number;
        perPage: number;
    }>;
    create(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, downloadSource: DownloadSourceBase, options?: {
        id?: string;
        overwrite?: boolean;
    }): Promise<DownloadSource>;
    update(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, id: string, newData: Partial<DownloadSource> & {
        auth?: DownloadSource['auth'] | null;
    }): Promise<void>;
    delete(id: string): Promise<{}>;
    getDefaultDownloadSourceId(): Promise<string | null>;
    ensureDefault(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient): Promise<DownloadSource>;
    requireUniqueName(downloadSource: {
        name: string;
        id?: string;
    }): Promise<void>;
    listAllForProxyId(proxyId: string): Promise<{
        items: DownloadSource[];
        total: number;
    }>;
    private throwIfProxyNotFound;
    private _getDefaultDownloadSourceSO;
}
export declare const downloadSourceService: DownloadSourceService;
export {};
