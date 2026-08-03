import { type EuiBasicTableColumn } from '@elastic/eui';
import type { estypes } from '@elastic/elasticsearch';
import { type SignificantItem } from '@kbn/ml-agg-utils';
export declare const LOG_RATE_ANALYSIS_RESULTS_TABLE_TYPE: {
    readonly GROUPS: "groups";
    readonly SIGNIFICANT_ITEMS: "significantItems";
};
export type LogRateAnalysisResultsTableType = (typeof LOG_RATE_ANALYSIS_RESULTS_TABLE_TYPE)[keyof typeof LOG_RATE_ANALYSIS_RESULTS_TABLE_TYPE];
export declare const useColumns: (tableType: LogRateAnalysisResultsTableType, skippedColumns: string[], searchQuery: estypes.QueryDslQueryContainer, barColorOverride?: string, barHighlightColorOverride?: string, isExpandedRow?: boolean) => Array<EuiBasicTableColumn<SignificantItem>>;
