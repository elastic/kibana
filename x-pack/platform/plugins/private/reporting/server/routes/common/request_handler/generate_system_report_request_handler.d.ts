import type { TypeOf } from '@kbn/config-schema';
import type { KibanaRequest, KibanaResponseFactory, RequestHandlerContext, Logger, IKibanaResponse } from '@kbn/core/server';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import type { JobParamsCSV } from '@kbn/reporting-export-types-csv-common';
import type { ReportingCore } from '../../..';
import type { ReportingRequestHandlerContext, ReportingUser } from '../../../types';
import type { SavedReport } from '../../../lib/store';
import type { RequestParams } from './request_handler';
import { RequestHandler, type ParamsValidation, type QueryValidation, type BodyValidation } from './request_handler';
export interface InternalReportParams {
    title: string;
    searchSource: SerializedSearchSourceFields;
    timezone?: string;
}
export interface GenerateSystemReportRequestParams<P extends typeof ParamsValidation = typeof ParamsValidation, Q extends typeof QueryValidation = typeof QueryValidation, B extends typeof BodyValidation = typeof BodyValidation> {
    reportParams: InternalReportParams;
    request: KibanaRequest<TypeOf<P>, TypeOf<Q>, TypeOf<B>>;
    response: KibanaResponseFactory;
    context: RequestHandlerContext;
}
interface GenerateSystemReportResult {
    report: SavedReport;
    downloadUrl: string;
}
export type HandleResponseFunc = (result: GenerateSystemReportResult | null, err?: Error) => Promise<IKibanaResponse>;
/**
 * Creates a request handler that can be configured by other plugin routes
 * to encapsulate creating reports derived from system indices
 */
export declare class GenerateSystemReportRequestHandler<P extends typeof ParamsValidation, Q extends typeof QueryValidation, B extends typeof BodyValidation> extends RequestHandler<P, Q, B, SavedReport> {
    private handleResponse;
    constructor(opts: {
        reporting: ReportingCore;
        user: ReportingUser;
        context: ReportingRequestHandlerContext;
        path: string;
        req: KibanaRequest<TypeOf<P>, TypeOf<Q>, TypeOf<B>>;
        res: KibanaResponseFactory;
        logger: Logger;
    }, config: {
        handleResponse: HandleResponseFunc;
    });
    enqueueJob(params: RequestParams): Promise<SavedReport>;
    handleRequest(params: RequestParams & {
        jobParams: JobParamsCSV;
    }): Promise<IKibanaResponse<any>>;
    private checkSupportedExportType;
    private checkSupportedIndex;
}
export type HandleGenerateSystemReportRequestFunc = ReturnType<typeof handleGenerateSystemReportRequest>;
export declare function handleGenerateSystemReportRequest<P extends typeof ParamsValidation = typeof ParamsValidation, Q extends typeof QueryValidation = typeof QueryValidation, B extends typeof BodyValidation = typeof BodyValidation>(reporting: ReportingCore, logger: Logger, path: string, requestParams: GenerateSystemReportRequestParams<P, Q, B>, handleResponse: HandleResponseFunc): Promise<IKibanaResponse<any>>;
export {};
