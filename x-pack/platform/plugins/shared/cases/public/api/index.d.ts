import type { HttpStart } from '@kbn/core/public';
import type { CasesFindRequest, CasesBulkGetRequest, CasesBulkGetResponse, CasesMetricsRequest } from '../../common/types/api';
import type { CasesMetrics, CasesFindResponseUI } from '../../common/ui';
export interface HTTPService {
    http: HttpStart;
    signal?: AbortSignal;
}
export declare const getCases: ({ http, signal, query, }: HTTPService & {
    query: CasesFindRequest;
}) => Promise<CasesFindResponseUI>;
export declare const getCasesMetrics: ({ http, signal, query, }: HTTPService & {
    query: CasesMetricsRequest;
}) => Promise<CasesMetrics>;
export declare const bulkGetCases: ({ http, signal, params, }: HTTPService & {
    params: CasesBulkGetRequest;
}) => Promise<CasesBulkGetResponse>;
