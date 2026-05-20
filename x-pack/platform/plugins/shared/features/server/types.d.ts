import type { CustomRequestHandlerContext, IRouter } from '@kbn/core/server';
import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';
/**
 * @internal
 */
export type FeaturesRequestHandlerContext = CustomRequestHandlerContext<{
    licensing: LicensingApiRequestHandlerContext;
}>;
/**
 * @internal
 */
export type FeaturesPluginRouter = IRouter<FeaturesRequestHandlerContext>;
