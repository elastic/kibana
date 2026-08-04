import type { FC } from 'react';
import type { estypes } from '@elastic/elasticsearch';
import type { GroupTableItemGroup } from '@kbn/aiops-log-rate-analysis/state';
interface LogRateAnalysisResultsTableProps {
    groupFilter?: GroupTableItemGroup[];
    searchQuery: estypes.QueryDslQueryContainer;
    /** Optional color override for the default bar color for charts */
    barColorOverride?: string;
    /** Optional color override for the highlighted bar color for charts */
    barHighlightColorOverride?: string;
    skippedColumns: string[];
}
export declare const LogRateAnalysisResultsTable: FC<LogRateAnalysisResultsTableProps>;
export {};
