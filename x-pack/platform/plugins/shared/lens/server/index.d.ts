import type { PluginInitializerContext } from '@kbn/core-plugins-server';
export type { LensServerPluginSetup } from './plugin';
export declare const plugin: (initContext: PluginInitializerContext) => Promise<import("./plugin").LensServerPlugin>;
export { lensGetRequestParamsSchema, lensGetResponseBodySchema, lensCreateRequestBodySchema, lensCreateResponseBodySchema, lensUpdateRequestParamsSchema, lensUpdateRequestBodySchema, lensUpdateResponseBodySchema, lensDeleteRequestParamsSchema, lensSearchRequestQuerySchema, lensSearchResponseBodySchema, } from './api/schema';
export type { LensDocShape715 } from './migrations/types';
export type { LensCreateRequestBody, LensCreateResponseBody, LensUpdateRequestParams, LensUpdateRequestBody, LensUpdateResponseBody, LensGetRequestParams, LensGetResponseBody, LensSearchRequestQuery, LensSearchResponseBody, LensDeleteRequestParams, RegisterAPIRoutesArgs, RegisterAPIRouteFn, } from './types';
export type { DiscoverDrilldownState } from './drilldowns/types';
