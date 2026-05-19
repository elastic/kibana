import { type FC } from 'react';
import type { estypes } from '@elastic/elasticsearch';
import { type WindowParameters } from '@kbn/aiops-log-rate-analysis';
import { type LogRateAnalysisResultsData } from '../log_rate_analysis_results';
export declare const DEFAULT_SEARCH_QUERY: NonNullable<estypes.QueryDslQueryContainer>;
export interface LogRateAnalysisContentProps {
    /** Elasticsearch query to pass to analysis endpoint */
    esSearchQuery?: estypes.QueryDslQueryContainer;
    /** Optional color override for the default bar color for charts */
    barColorOverride?: string;
    /** Optional color override for the highlighted bar color for charts */
    barHighlightColorOverride?: string;
    /** Optional callback that exposes data of the completed analysis */
    onAnalysisCompleted?: (d: LogRateAnalysisResultsData) => void;
    /** Optional callback that exposes current window parameters */
    onWindowParametersChange?: (wp?: WindowParameters, replace?: boolean) => void;
}
export declare const LogRateAnalysisContent: FC<LogRateAnalysisContentProps>;
