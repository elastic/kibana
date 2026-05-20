import type { OverallStats } from '../types/overall_stats';
import type { DataStatsFetchProgress, OverallStatsSearchStrategyParams } from '../../../../common/types/field_stats';
export declare function useOverallStats<TParams extends OverallStatsSearchStrategyParams>(esql: boolean | undefined, searchStrategyParams: TParams | undefined, lastRefresh: number, probability?: number | null): {
    progress: DataStatsFetchProgress;
    overallStats: OverallStats;
};
