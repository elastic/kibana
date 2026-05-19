import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
export interface UseFetchAlertEpisodeTagSuggestionsOptions {
    services: {
        expressions: ExpressionsStart;
    };
    enabled?: boolean;
}
export declare const useFetchAlertEpisodeTagSuggestions: ({ services, enabled, }: UseFetchAlertEpisodeTagSuggestionsOptions) => import("@kbn/react-query").UseQueryResult<string[], unknown>;
