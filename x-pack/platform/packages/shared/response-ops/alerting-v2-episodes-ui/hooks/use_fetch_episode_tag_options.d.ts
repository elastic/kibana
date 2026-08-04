import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { TimeRange } from '@kbn/es-query';
export interface UseFetchEpisodeTagOptionsParams {
    services: {
        expressions: ExpressionsStart;
        spaces: SpacesPluginStart;
    };
    timeRange?: TimeRange | null;
}
export declare const useFetchEpisodeTagOptions: ({ services, timeRange, }: UseFetchEpisodeTagOptionsParams) => import("@tanstack/react-query").UseQueryResult<string[], unknown>;
