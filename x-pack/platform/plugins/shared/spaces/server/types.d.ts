import type { CustomRequestHandlerContext, IRouter } from '@kbn/core/server';
import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';
import type { spaceV1 as v1 } from '../common';
/**
 * @internal
 */
export type SpacesRequestHandlerContext = CustomRequestHandlerContext<{
    licensing: LicensingApiRequestHandlerContext;
}>;
/**
 * @internal
 */
export type SpacesRouter = IRouter<SpacesRequestHandlerContext>;
/**
 * @internal
 */
export type SpaceSavedObjectAttributes = Partial<Omit<v1.Space, 'id' | 'projectRouting'>>;
