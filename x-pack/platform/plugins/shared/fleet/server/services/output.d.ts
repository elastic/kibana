import type { ElasticsearchClient, SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import type { NewOutput, Output, OutputSOAttributes } from '../types';
export declare function outputIdToUuid(id: string): string;
export declare function outputSavedObjectToOutput(so: SavedObject<OutputSOAttributes>): Output;
declare class OutputService {
    private get soClient();
    private get encryptedSoClient();
    private _getDefaultDataOutputsSO;
    private _getDefaultMonitoringOutputsSO;
    private _updateDefaultOutput;
    private _validateFieldsAreEditable;
    ensureDefaultOutput(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient): Promise<Output>;
    getDefaultESHosts(): string[];
    getDefaultDataOutputId(): Promise<string | null>;
    getDefaultMonitoringOutputId(): Promise<string | null>;
    create(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, output: NewOutput, options?: {
        id?: string;
        fromPreconfiguration?: boolean;
        overwrite?: boolean;
        secretHashes?: Record<string, any>;
    }): Promise<Output>;
    bulkGet(ids: string[], { ignoreNotFound }?: {
        ignoreNotFound?: true;
    }): Promise<Output[]>;
    list(): Promise<{
        items: Output[];
        total: number;
        page: number;
        perPage: number;
    }>;
    listAllForProxyId(proxyId: string): Promise<{
        items: Output[];
        total: number;
        page: number;
        perPage: number;
    }>;
    get(id: string): Promise<Output>;
    delete(id: string, { fromPreconfiguration }?: {
        fromPreconfiguration?: boolean;
    }): Promise<{}>;
    update(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient, id: string, data: Partial<Output>, { fromPreconfiguration, secretHashes, }?: {
        fromPreconfiguration: boolean;
        secretHashes?: Record<string, any>;
    }): Promise<void>;
    backfillAllOutputPresets(soClient: SavedObjectsClientContract, esClient: ElasticsearchClient): Promise<void>;
    getLatestOutputHealth(esClient: ElasticsearchClient, id: string): Promise<OutputHealth>;
    getOutputLastUpdateTime(id: string): Promise<string | undefined>;
}
interface OutputHealth {
    state: string;
    message: string;
    timestamp: string;
}
export declare const outputService: OutputService;
export {};
