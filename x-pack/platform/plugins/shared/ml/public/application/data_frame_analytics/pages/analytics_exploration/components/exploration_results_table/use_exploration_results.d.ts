import type { DataView } from '@kbn/data-views-plugin/public';
import { type DataFrameAnalyticsConfig } from '@kbn/ml-data-frame-analytics-utils';
import { type UseIndexDataReturnType } from '@kbn/ml-data-grid';
import type { estypes } from '@elastic/elasticsearch';
export declare const useExplorationResults: (dataView: DataView | undefined, jobConfig: DataFrameAnalyticsConfig | undefined, searchQuery: estypes.QueryDslQueryContainer) => UseIndexDataReturnType;
