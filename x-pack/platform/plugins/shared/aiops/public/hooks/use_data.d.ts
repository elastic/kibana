import type { Moment } from 'moment';
import type { estypes } from '@elastic/elasticsearch';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { SignificantItem } from '@kbn/ml-agg-utils';
import type { Dictionary } from '@kbn/ml-url-state';
import type { GroupTableItem } from '@kbn/aiops-log-rate-analysis/state';
export declare const useData: (selectedDataView: DataView, contextId: string, searchQuery: NonNullable<estypes.QueryDslQueryContainer>, onUpdate?: (params: Dictionary<unknown>) => void, selectedSignificantItem?: SignificantItem, selectedGroup?: GroupTableItem | null, barTarget?: number, changePointsByDefault?: boolean, timeRange?: {
    min: Moment;
    max: Moment;
}) => {
    documentStats: import("./use_document_count_stats").DocumentStats;
    timefilter: import("@kbn/data-plugin/public").TimefilterContract;
    /** Start timestamp filter */
    earliest: number | undefined;
    /** End timestamp filter */
    latest: number | undefined;
    intervalMs: number | undefined;
    forceRefresh: () => void;
};
