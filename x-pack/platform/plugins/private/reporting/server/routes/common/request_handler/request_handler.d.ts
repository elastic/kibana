import Boom from '@hapi/boom';
import type { TypeOf } from '@kbn/config-schema';
import type { IKibanaResponse, KibanaRequest, KibanaResponseFactory, Logger } from '@kbn/core/server';
import type { BaseParams } from '@kbn/reporting-common/types';
import type { RruleSchedule } from '@kbn/task-manager-plugin/server';
import type { RawNotification } from '../../../saved_objects/scheduled_report/schemas/latest';
import { type Counters } from '..';
import type { ReportingCore } from '../../..';
import type { ReportingRequestHandlerContext, ReportingUser } from '../../../types';
export declare const handleUnavailable: (res: KibanaResponseFactory) => IKibanaResponse<any>;
export declare const ParamsValidation: import("@kbn/config-schema").Type<Record<string, string>>;
export declare const QueryValidation: import("@kbn/config-schema").Type<Record<string, string | undefined> | null>;
export declare const BodyValidation: import("@kbn/config-schema").Type<Record<string, any> | null>;
interface ConstructorOpts<Params extends typeof ParamsValidation, Query extends typeof QueryValidation, Body extends typeof BodyValidation> {
    reporting: ReportingCore;
    user: ReportingUser;
    context: ReportingRequestHandlerContext;
    path: string;
    req: KibanaRequest<TypeOf<Params>, TypeOf<Query>, TypeOf<Body>>;
    res: KibanaResponseFactory;
    logger: Logger;
}
export interface RequestParams {
    exportTypeId: string;
    jobParams: BaseParams;
    id?: string;
    schedule?: RruleSchedule;
    notification?: RawNotification;
}
/**
 * Handles the common parts of requests to generate or schedule a report
 * Serves report job handling in the context of the request to generate the report
 */
export declare abstract class RequestHandler<Params extends typeof ParamsValidation, Query extends typeof QueryValidation, Body extends typeof BodyValidation, Output extends Record<string, any>> {
    protected readonly opts: ConstructorOpts<Params, Query, Body>;
    constructor(opts: ConstructorOpts<Params, Query, Body>);
    static getValidation(): void;
    abstract enqueueJob(params: RequestParams): Promise<Output>;
    abstract handleRequest(params: RequestParams): Promise<IKibanaResponse>;
    getJobParams(): BaseParams;
    protected createJob(exportTypeId: string, jobParams: BaseParams): Promise<{
        job: Omit<any, "headers" | "spaceId">;
        version: string;
        jobType: string;
        name: string;
    }>;
    protected checkLicense(exportTypeId: string): Promise<IKibanaResponse | null>;
    protected encryptHeaders(): Promise<string>;
    protected handleError(err: Error | Boom.Boom, counters?: Counters, jobtype?: string): IKibanaResponse<any>;
}
export {};
