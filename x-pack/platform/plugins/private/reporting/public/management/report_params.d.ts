import type { ReportingAPIClient } from '@kbn/reporting-public';
import type { ReportTypeId } from '../types';
export declare const supportedReportTypes: ReportTypeId[];
export interface GetReportParamsOptions {
    apiClient: ReportingAPIClient;
    reportTypeId: ReportTypeId;
    objectType: string;
    sharingData: any;
    title: string;
}
export declare const getReportParams: ({ apiClient, reportTypeId, objectType, sharingData, title, }: GetReportParamsOptions) => string;
