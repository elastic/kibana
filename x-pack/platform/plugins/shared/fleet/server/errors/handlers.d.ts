import type Boom from '@hapi/boom';
import type { IKibanaResponse, KibanaResponseFactory, RequestHandlerContext } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core/server';
import { FleetError } from '.';
type IngestErrorHandler = (params: IngestErrorHandlerParams) => IKibanaResponse | Promise<IKibanaResponse>;
interface IngestErrorHandlerParams {
    error: FleetError | Boom.Boom | Error;
    response: KibanaResponseFactory;
    request?: KibanaRequest;
    context?: RequestHandlerContext;
}
export declare function fleetErrorToResponseOptions(error: IngestErrorHandlerParams['error']): {
    statusCode: number;
    body: {
        attributes?: {
            limit: number | undefined;
        } | {
            limit?: number | undefined;
            type: string;
        } | undefined;
        message: string;
    };
};
export declare const defaultFleetErrorHandler: IngestErrorHandler;
export {};
