import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { type AlertEpisodeEsqlRow, type EpisodesFilterState, type EpisodesSortState } from '../queries/episodes_query';
export interface FetchAlertingEpisodesOptions {
    pageSize: number;
    timeRange?: TimeRange | null;
    filterState?: EpisodesFilterState;
    sortState?: EpisodesSortState;
    abortSignal?: AbortSignal;
    services: {
        expressions: ExpressionsStart;
    };
}
/**
 * Executes an ES|QL query to fetch alerting episodes.
 * Uses the timestamp of the last episode from the previous page as a cursor for pagination.
 */
export declare const fetchAlertingEpisodes: ({ abortSignal, pageSize, services: { expressions }, filterState, sortState, timeRange, }: FetchAlertingEpisodesOptions) => Promise<AlertEpisodeEsqlRow[]>;
