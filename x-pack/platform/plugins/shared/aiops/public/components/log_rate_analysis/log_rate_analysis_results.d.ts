import type { FC } from 'react';
import type { estypes } from '@elastic/elasticsearch';
import { type LogRateAnalysisType } from '@kbn/aiops-log-rate-analysis';
import type { SignificantItem, SignificantItemGroup } from '@kbn/ml-agg-utils';
/**
 * Interface for log rate analysis results data.
 */
export interface LogRateAnalysisResultsData {
    /** The type of analysis, whether it's a spike or dip */
    analysisType: LogRateAnalysisType;
    /** Statistically significant field/value items. */
    significantItems: SignificantItem[];
    /** Statistically significant groups of field/value items. */
    significantItemsGroups: SignificantItemGroup[];
}
/**
 * LogRateAnalysis props require a data view.
 */
interface LogRateAnalysisResultsProps {
    /** Callback for resetting the analysis */
    onReset: () => void;
    /** The search query to be applied to the analysis as a filter */
    searchQuery: estypes.QueryDslQueryContainer;
    /** Optional color override for the default bar color for charts */
    barColorOverride?: string;
    /** Optional color override for the highlighted bar color for charts */
    barHighlightColorOverride?: string;
}
export declare const LogRateAnalysisResults: FC<LogRateAnalysisResultsProps>;
export {};
