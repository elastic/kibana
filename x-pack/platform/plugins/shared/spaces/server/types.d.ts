import type { CustomRequestHandlerContext, IRouter } from '@kbn/core/server';
import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';
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
