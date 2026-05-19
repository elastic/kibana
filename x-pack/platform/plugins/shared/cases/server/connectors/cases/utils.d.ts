import type { CaseRequestCustomFields } from '../../../common/types/api';
import type { CaseCustomFields, CustomFieldsConfiguration } from '../../../common/types/domain';
import type { BulkGetOracleRecordsResponse, OracleRecord, OracleRecordError } from './types';
export declare const isRecordError: (so: OracleRecord | OracleRecordError) => so is OracleRecordError;
export declare const partitionRecordsByError: (res: BulkGetOracleRecordsResponse) => [OracleRecord[], OracleRecordError[]];
export declare const partitionByNonFoundErrors: <T extends Array<{
    statusCode: number;
}>>(errors: T) => [T, T];
export declare const convertValueToString: (value: unknown) => string;
export declare const buildCustomFieldsForRequest: (customFieldsConfiguration?: CustomFieldsConfiguration, templateCustomFields?: CaseCustomFields) => CaseRequestCustomFields;
export declare const constructRequiredKibanaPrivileges: (owner: string) => string[];
