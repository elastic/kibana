import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
export interface UseFetchSameRuleEpisodesQueryOptions {
    ruleId: string | undefined;
    excludeEpisodeId: string | undefined;
    pageSize: number;
    currentGroupHash: string | undefined;
    expressions: ExpressionsStart;
    toastDanger?: (message: string) => void;
}
/**
 * Fetches other episodes for the same rule.
 *
 * If the group hash is set, excludes it from the query.
 */
export declare const useFetchSameRuleEpisodesQuery: ({ ruleId, excludeEpisodeId, pageSize, currentGroupHash, expressions, toastDanger, }: UseFetchSameRuleEpisodesQueryOptions) => import("@kbn/react-query").UseQueryResult<import("../queries/episodes_query").AlertEpisode[], unknown>;
