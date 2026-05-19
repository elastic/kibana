import type { Either } from 'fp-ts/Either';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/core/server';
import type { IndexInfo } from '../rule_data_plugin_service/index_info';
import type { IResourceInstaller } from '../rule_data_plugin_service/resource_installer';
import type { IRuleDataClient, IRuleDataReader, IRuleDataWriter } from './types';
export interface RuleDataClientConstructorOptions {
    indexInfo: IndexInfo;
    resourceInstaller: IResourceInstaller;
    isWriteEnabled: boolean;
    isWriterCacheEnabled: boolean;
    waitUntilReadyForReading: Promise<WaitResult>;
    waitUntilReadyForWriting: Promise<WaitResult>;
    logger: Logger;
    isUsingDataStreams: boolean;
}
export type WaitResult = Either<Error, ElasticsearchClient>;
export declare class RuleDataClient implements IRuleDataClient {
    private readonly options;
    private _isWriteEnabled;
    private _isWriterCacheEnabled;
    private readonly _isUsingDataStreams;
    private writerCache;
    private clusterClient;
    constructor(options: RuleDataClientConstructorOptions);
    get indexName(): string;
    get kibanaVersion(): string;
    indexNameWithNamespace(namespace: string): string;
    private get writeEnabled();
    private set writeEnabled(value);
    isWriteEnabled(): boolean;
    private get writerCacheEnabled();
    private set writerCacheEnabled(value);
    isUsingDataStreams(): boolean;
    getReader(options?: {
        namespace?: string;
    }): IRuleDataReader;
    getWriter(options?: {
        namespace?: string;
    }): Promise<IRuleDataWriter>;
    private initializeWriter;
}
