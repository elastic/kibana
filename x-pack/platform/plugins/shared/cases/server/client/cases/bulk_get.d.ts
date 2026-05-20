import type { CasesBulkGetRequest, CasesBulkGetResponse } from '../../../common/types/api';
import type { CasesClientArgs } from '../types';
/**
 * Retrieves multiple cases by ids.
 */
export declare const bulkGet: (params: CasesBulkGetRequest, clientArgs: CasesClientArgs) => Promise<CasesBulkGetResponse>;
