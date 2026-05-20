import type { FC } from 'react';
import type { estypes } from '@elastic/elasticsearch';
import { type SignificantItem } from '@kbn/ml-agg-utils';
import { type GroupTableItem } from '@kbn/aiops-log-rate-analysis/state';
interface LogRateAnalysisResultsTableProps {
    skippedColumns: string[];
    significantItems: SignificantItem[];
    groupTableItems: GroupTableItem[];
    searchQuery: estypes.QueryDslQueryContainer;
    /** Optional color override for the default bar color for charts */
    barColorOverride?: string;
    /** Optional color override for the highlighted bar color for charts */
    barHighlightColorOverride?: string;
}
export declare const LogRateAnalysisResultsGroupsTable: FC<LogRateAnalysisResultsTableProps>;
export {};
