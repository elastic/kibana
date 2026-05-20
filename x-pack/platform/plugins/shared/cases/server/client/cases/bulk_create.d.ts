import type { CasesClient, CasesClientArgs } from '..';
import type { BulkCreateCasesRequest, BulkCreateCasesResponse } from '../../../common/types/api';
export declare const bulkCreate: (data: BulkCreateCasesRequest, clientArgs: CasesClientArgs, casesClient: CasesClient) => Promise<BulkCreateCasesResponse>;
