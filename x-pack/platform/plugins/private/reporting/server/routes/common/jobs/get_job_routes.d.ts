import type { TypeOf } from '@kbn/config-schema';
import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core-http-server';
import type { ReportingCore } from '../../..';
import type { ReportingRequestHandlerContext, ReportingUser } from '../../../types';
declare const validate: {
    params: import("@kbn/config-schema").ObjectType<{
        docId: import("@kbn/config-schema").Type<string>;
    }>;
};
interface HandlerOpts {
    path: string;
    user: ReportingUser;
    context: ReportingRequestHandlerContext;
    req: KibanaRequest<TypeOf<(typeof validate)['params']>>;
    res: KibanaResponseFactory;
}
export declare const commonJobsRouteHandlerFactory: (reporting: ReportingCore, { isInternal }: {
    isInternal: boolean;
}) => {
    validate: {
        params: import("@kbn/config-schema").ObjectType<{
            docId: import("@kbn/config-schema").Type<string>;
        }>;
    };
    handleDownloadReport: ({ path, user, context, req, res }: HandlerOpts) => import("@kbn/core-http-server").IKibanaResponse<any> | Promise<import("@kbn/core-http-server").IKibanaResponse<any>>;
    handleDeleteReport: ({ path, user, context, req, res }: HandlerOpts) => import("@kbn/core-http-server").IKibanaResponse<any> | Promise<import("@kbn/core-http-server").IKibanaResponse<any>>;
};
export {};
