import type { TimeRange } from '@kbn/es-query';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { type EpisodesFilterState } from '../queries/episodes_query';
export interface EpisodesKpisData {
    alertsCount: number;
    firingRules: number;
    assignedToMe: number;
    unassigned: number;
    acknowledged: number;
    snoozed: number;
}
export interface UseEpisodesKpisQueryOptions {
    services: {
        expressions: ExpressionsStart;
        spaces: SpacesPluginStart;
        userProfile: CoreStart['userProfile'];
    };
    filterState?: EpisodesFilterState;
    timeRange?: TimeRange;
}
export interface UseEpisodesKpisQueryResult {
    data: EpisodesKpisData | undefined;
    isLoading: boolean;
    isError: boolean;
}
export declare const useEpisodesKpisQuery: ({ services, filterState, timeRange, }: UseEpisodesKpisQueryOptions) => UseEpisodesKpisQueryResult;
