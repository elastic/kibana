import type { CustomRequestHandlerContext, IRouter } from '@kbn/core/server';
import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';
/**
 * @internal
 */
export type SecurityRequestHandlerContext = CustomRequestHandlerContext<{
    licensing: LicensingApiRequestHandlerContext;
}>;
/**
 * @internal
 */
export type SecurityRouter = IRouter<SecurityRequestHandlerContext>;
