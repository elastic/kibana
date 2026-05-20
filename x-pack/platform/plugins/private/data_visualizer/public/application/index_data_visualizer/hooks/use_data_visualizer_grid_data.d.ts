import type { Required } from 'utility-types';
import type { EuiTableActionsColumnType } from '@elastic/eui';
import type { Dictionary } from '@kbn/ml-url-state';
import type { RandomSamplerOption } from '../constants/random_sampler';
import type { DataVisualizerIndexBasedAppState } from '../types/index_data_visualizer_state';
import type { MetricFieldsStats } from '../../common/components/stats_table/components/field_count_stats';
import type { FieldVisConfig } from '../../common/components/stats_table/types';
import type { FieldStatisticTableEmbeddableProps } from '../embeddables/grid_embeddable/types';
export declare const useDataVisualizerGridData: (input: Required<FieldStatisticTableEmbeddableProps, "dataView">, dataVisualizerListState: Required<DataVisualizerIndexBasedAppState>, savedRandomSamplerPreference?: RandomSamplerOption, onUpdate?: (params: Dictionary<unknown>) => void) => {
    progress: number;
    overallStatsProgress: import("../../../../common/types/field_stats").DataStatsFetchProgress;
    configs: FieldVisConfig[];
    queryOrAggregateQuery: import("@kbn/data-plugin/common").Query | undefined;
    searchQueryLanguage: import("@kbn/ml-query-utils").SearchQueryLanguage;
    searchString: string | {
        [key: string]: any;
    };
    searchQuery: any;
    extendedColumns: EuiTableActionsColumnType<FieldVisConfig>[] | undefined;
    documentCountStats: import("../../../../common/types/field_stats").DocumentCountStats | undefined;
    metricsStats: MetricFieldsStats | undefined;
    overallStats: import("../types/overall_stats").OverallStats;
    timefilter: import("@kbn/data-plugin/public").TimefilterContract;
    setLastRefresh: import("react").Dispatch<import("react").SetStateAction<number>>;
};
