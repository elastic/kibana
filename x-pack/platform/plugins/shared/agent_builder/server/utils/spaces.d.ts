import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
export declare const isDefaultSpace: (space: string | undefined) => boolean;
export declare const getCurrentSpaceId: ({ spaces, request, }: {
    request: KibanaRequest;
    spaces: SpacesPluginStart | undefined;
}) => string;
export declare const createSpaceDslFilter: (space: string) => QueryDslQueryContainer;
