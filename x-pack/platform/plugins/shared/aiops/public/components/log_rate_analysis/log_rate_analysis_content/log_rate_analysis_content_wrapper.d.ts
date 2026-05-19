import { type FC } from 'react';
import type { Moment } from 'moment';
import type { estypes } from '@elastic/elasticsearch';
import type { WindowParameters } from '@kbn/aiops-log-rate-analysis';
import type { DataView } from '@kbn/data-views-plugin/public';
import { type AiopsAppContextValue } from '../../../hooks/use_aiops_app_context';
import type { LogRateAnalysisResultsData } from '../log_rate_analysis_results';
/**
 * Props for the LogRateAnalysisContentWrapper component.
 */
export interface LogRateAnalysisContentWrapperProps {
    /** The data view to analyze. */
    dataView: DataView;
    /** App dependencies */
    appContextValue: AiopsAppContextValue;
    /** Timestamp for start of initial analysis */
    initialAnalysisStart?: number | WindowParameters;
    /** Optional time range */
    timeRange?: {
        min: Moment;
        max: Moment;
    };
    /** Elasticsearch query to pass to analysis endpoint */
    esSearchQuery?: estypes.QueryDslQueryContainer;
    /** Optional color override for the default bar color for charts */
    barColorOverride?: string;
    /** Optional color override for the highlighted bar color for charts */
    barHighlightColorOverride?: string;
    /**
     * Optional callback that exposes data of the completed analysis
     * @param d Log rate analysis results data
     */
    onAnalysisCompleted?: (d: LogRateAnalysisResultsData) => void;
    /** Optional flag to indicate whether kibana is running in serverless */
    showFrozenDataTierChoice?: boolean;
}
export declare const LogRateAnalysisContentWrapper: FC<LogRateAnalysisContentWrapperProps>;
