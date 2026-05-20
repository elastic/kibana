import type { FieldStatsSearchStrategyReturnBase, OverallStatsSearchStrategyParams } from '../../../../common/types/field_stats';
import type { FieldRequestConfig } from '../../../../common/types';
import type { DataVisualizerIndexBasedAppState } from '../types/index_data_visualizer_state';
interface FieldStatsParams {
    metricConfigs: FieldRequestConfig[];
    nonMetricConfigs: FieldRequestConfig[];
}
export declare function useFieldStatsSearchStrategy(searchStrategyParams: OverallStatsSearchStrategyParams | undefined, fieldStatsParams: FieldStatsParams | undefined, dataVisualizerListState: DataVisualizerIndexBasedAppState, samplingProbability: number | null): FieldStatsSearchStrategyReturnBase;
export {};
