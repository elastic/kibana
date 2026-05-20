import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
export interface UseFetchAlertEpisodeTagSuggestionsOptions {
    services: {
        expressions: ExpressionsStart;
        spaces: SpacesPluginStart;
    };
    enabled?: boolean;
}
export declare const useFetchAlertEpisodeTagSuggestions: ({ services, enabled, }: UseFetchAlertEpisodeTagSuggestionsOptions) => import("@kbn/react-query").UseQueryResult<string[], unknown>;
