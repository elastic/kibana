import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
export interface UseFetchSameGroupEpisodesQueryOptions {
    ruleId: string | undefined;
    excludeEpisodeId: string | undefined;
    pageSize: number;
    /** Required; hook stays idle when missing. */
    groupHash: string | undefined;
    expressions: ExpressionsStart;
    toastDanger?: (message: string) => void;
}
/**
 * Fetches other episodes for the same rule and same `group_hash` (excluding the current id).
 * Builds `buildSameGroupRelatedAlertEpisodesEsqlQuery` and passes the printed query to
 * `fetchRelatedEpisodes`.
 */
export declare const useFetchSameGroupEpisodesQuery: ({ ruleId, excludeEpisodeId, pageSize, groupHash, expressions, toastDanger, }: UseFetchSameGroupEpisodesQueryOptions) => import("@kbn/react-query").UseQueryResult<import("../queries/episodes_query").AlertEpisode[], unknown>;
