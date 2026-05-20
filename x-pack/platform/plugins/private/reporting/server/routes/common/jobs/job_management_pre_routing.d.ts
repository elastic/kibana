import type { IKibanaResponse, kibanaResponseFactory } from '@kbn/core/server';
import type { JobId, ReportApiJSON } from '@kbn/reporting-common/types';
import type { Counters } from '..';
import type { ReportingCore } from '../../..';
import type { ReportingUser } from '../../../types';
/**
 * The body of a route handler to call via callback
 */
type JobManagementResponseHandler = (doc: ReportApiJSON) => Promise<IKibanaResponse<object>>;
/**
 * Handles the common parts of requests to manage (view, download and delete) reports
 */
export declare const jobManagementPreRouting: (reporting: ReportingCore, res: typeof kibanaResponseFactory, jobId: JobId, user: ReportingUser, counters: Counters, { isInternal }: {
    isInternal: boolean;
}, cb: JobManagementResponseHandler) => Promise<IKibanaResponse<any>>;
export {};
