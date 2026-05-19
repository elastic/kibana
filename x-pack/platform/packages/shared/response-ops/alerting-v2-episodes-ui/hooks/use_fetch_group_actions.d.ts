import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { AlertEpisodeGroupAction } from '../types/action';
export interface UseFetchGroupActionsOptions {
    groupHashes: string[];
    expressions: ExpressionsStart;
}
export declare const useFetchGroupActions: ({ groupHashes, expressions }: UseFetchGroupActionsOptions) => import("@kbn/react-query").UseQueryResult<Map<string, AlertEpisodeGroupAction>, unknown>;
