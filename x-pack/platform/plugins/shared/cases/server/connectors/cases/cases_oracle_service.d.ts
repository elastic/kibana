import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { BulkCreateOracleRecordRequest, BulkGetOracleRecordsResponse, BulkUpdateOracleRecordRequest, OracleKey, OracleRecord, OracleRecordCreateRequest } from './types';
export declare class CasesOracleService {
    private readonly logger;
    private readonly savedObjectsClient;
    private cryptoService;
    constructor({ logger, savedObjectsClient, }: {
        logger: Logger;
        savedObjectsClient: SavedObjectsClientContract;
    });
    getRecordId({ ruleId, spaceId, owner, grouping }: OracleKey): string;
    getRecord(recordId: string): Promise<OracleRecord>;
    bulkGetRecords(ids: string[]): Promise<BulkGetOracleRecordsResponse>;
    createRecord(recordId: string, payload: OracleRecordCreateRequest): Promise<OracleRecord>;
    bulkCreateRecord(records: BulkCreateOracleRecordRequest): Promise<BulkGetOracleRecordsResponse>;
    increaseCounter(recordId: string): Promise<OracleRecord>;
    bulkUpdateRecord(records: BulkUpdateOracleRecordRequest): Promise<BulkGetOracleRecordsResponse>;
    private getRecordResponse;
    private getBulkRecordsResponse;
    private getErrorResponse;
    private getCreateRecordAttributes;
    private getCreateRecordReferences;
}
