import { ReportingError } from '@kbn/reporting-common';
import type { ExecutionError } from '@kbn/reporting-common/types';
export declare function isExecutionError(error: ExecutionError | unknown): error is ExecutionError;
/**
 * Map an error object from the Screenshotting plugin into an error type of the Reporting domain.
 *
 * NOTE: each type of ReportingError code must be referenced in each applicable `errorCodesSchema*` object in
 * x-pack/platform/plugins/private/reporting/server/usage/schema.ts
 *
 * @param {unknown} error - a kind of error object
 * @returns {ReportingError} - the converted error object
 */
export declare function mapToReportingError(error: ExecutionError | unknown): ReportingError;
