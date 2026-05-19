import type { CustomRequestHandlerContext, RequestHandler } from '@kbn/core/server';
import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';
export declare const createLicensedRouteHandler: <P, Q, B, Context extends CustomRequestHandlerContext<{
    licensing: LicensingApiRequestHandlerContext;
}>>(handler: RequestHandler<P, Q, B, Context>) => RequestHandler<P, Q, B, Context>;
