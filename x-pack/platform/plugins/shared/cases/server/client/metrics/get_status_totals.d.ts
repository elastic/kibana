import type { CasesStatusRequest, CasesStatusResponse } from '../../../common/types/api';
import type { CasesClientArgs } from '../types';
export declare function getStatusTotalsByType(params: CasesStatusRequest, clientArgs: CasesClientArgs): Promise<CasesStatusResponse>;
