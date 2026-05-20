import type { CasesStatusRequest, CasesStatusResponse, SingleCaseMetricsResponse, CasesMetricsRequest, CasesMetricsResponse } from '../../../common/types/api';
import type { CasesClient } from '../client';
import type { CasesClientArgs } from '../types';
import type { GetCaseMetricsParams } from './types';
/**
 * API for interacting with the metrics.
 */
export interface MetricsSubClient {
    getCaseMetrics(params: GetCaseMetricsParams): Promise<SingleCaseMetricsResponse>;
    getCasesMetrics(params: CasesMetricsRequest): Promise<CasesMetricsResponse>;
    /**
     * Retrieves the total number of open, closed, and in-progress cases.
     */
    getStatusTotalsByType(params: CasesStatusRequest): Promise<CasesStatusResponse>;
}
/**
 * Creates the interface for retrieving metrics for cases.
 *
 * @ignore
 */
export declare const createMetricsSubClient: (clientArgs: CasesClientArgs, casesClient: CasesClient) => MetricsSubClient;
