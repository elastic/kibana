import type { SavedReport } from '../../../lib/store';
import type { RequestParams } from './request_handler';
import { RequestHandler } from './request_handler';
declare const validation: {
    params: import("@kbn/config-schema").ObjectType<{
        exportType: import("@kbn/config-schema").Type<string>;
    }>;
    body: import("@kbn/config-schema").Type<Readonly<{
        jobParams?: string | undefined;
    } & {}> | null>;
    query: import("@kbn/config-schema").Type<Readonly<{} & {
        jobParams: string;
    }> | null>;
};
/**
 * Handles the common parts of requests to generate a report
 * Serves report job handling in the context of the request to generate the report
 */
export declare class GenerateRequestHandler extends RequestHandler<(typeof validation)['params'], (typeof validation)['query'], (typeof validation)['body'], SavedReport> {
    static getValidation(): {
        params: import("@kbn/config-schema").ObjectType<{
            exportType: import("@kbn/config-schema").Type<string>;
        }>;
        body: import("@kbn/config-schema").Type<Readonly<{
            jobParams?: string | undefined;
        } & {}> | null>;
        query: import("@kbn/config-schema").Type<Readonly<{} & {
            jobParams: string;
        }> | null>;
    };
    enqueueJob(params: RequestParams): Promise<SavedReport>;
    handleRequest(params: RequestParams): Promise<import("@kbn/core/server").IKibanaResponse<any>>;
}
export {};
