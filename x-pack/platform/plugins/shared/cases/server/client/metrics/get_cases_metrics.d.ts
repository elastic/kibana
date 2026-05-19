import type { CasesMetricsRequest, CasesMetricsResponse } from '../../../common/types/api';
import type { CasesClient } from '../client';
import type { CasesClientArgs } from '../types';
export declare const getCasesMetrics: (params: CasesMetricsRequest, casesClient: CasesClient, clientArgs: CasesClientArgs) => Promise<CasesMetricsResponse>;
