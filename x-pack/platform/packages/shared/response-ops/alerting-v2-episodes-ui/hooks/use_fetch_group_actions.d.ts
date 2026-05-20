import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { AlertEpisodeGroupAction } from '../types/action';
export interface UseFetchGroupActionsOptions {
    groupHashes: string[];
    services: {
        expressions: ExpressionsStart;
        spaces: SpacesPluginStart;
    };
}
export declare const useFetchGroupActions: ({ groupHashes, services }: UseFetchGroupActionsOptions) => import("@kbn/react-query").UseQueryResult<Map<string, AlertEpisodeGroupAction>, unknown>;
