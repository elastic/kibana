import type { DocumentCountStats } from '@kbn/aiops-log-rate-analysis/types';
import type { DocumentStatsSearchStrategyParams } from '../get_document_stats';
export interface DocumentStats {
    sampleProbability: number;
    totalCount: number;
    documentCountStats?: DocumentCountStats;
    documentCountStatsCompare?: DocumentCountStats;
}
export declare function useDocumentCountStats<TParams extends DocumentStatsSearchStrategyParams>(searchParams: TParams | undefined, searchParamsCompare: TParams | undefined, lastRefresh: number, changePointsByDefault?: boolean): DocumentStats;
