import type { DeepPartial } from '@kbn/utility-types';
import type { NewJobCapsResponse } from '@kbn/ml-anomaly-utils';
import type { AnalyticsMapReturnType, DataFrameAnalyticsConfig, DataFrameAnalyticsStats, DeleteDataFrameAnalyticsWithIndexStatus, UpdateDataFrameAnalyticsConfig } from '@kbn/ml-data-frame-analytics-utils';
import type { ValidateAnalyticsJobResponse } from '@kbn/ml-validators';
import type { JobMessage } from '@kbn/ml-common-types/audit_message';
import type { PutDataFrameAnalyticsResponseSchema } from '../../../../server/routes/schemas/data_frame_analytics_schema';
import type { HttpService } from '../http_service';
export interface GetDataFrameAnalyticsStatsResponseOk {
    node_failures?: object;
    count: number;
    data_frame_analytics: DataFrameAnalyticsStats[];
}
export interface GetDataFrameAnalyticsStatsResponseError {
    statusCode: number;
    error: string;
    message: string;
}
export type GetDataFrameAnalyticsStatsResponse = GetDataFrameAnalyticsStatsResponseOk | GetDataFrameAnalyticsStatsResponseError;
export interface GetDataFrameAnalyticsResponse {
    count: number;
    data_frame_analytics: DataFrameAnalyticsConfig[];
}
export interface DeleteDataFrameAnalyticsWithIndexResponse {
    acknowledged: boolean;
    analyticsJobDeleted: DeleteDataFrameAnalyticsWithIndexStatus;
    destIndexDeleted: DeleteDataFrameAnalyticsWithIndexStatus;
    destDataViewDeleted: DeleteDataFrameAnalyticsWithIndexStatus;
}
export interface JobsExistsResponse {
    [jobId: string]: {
        exists: boolean;
    };
}
export declare const dataFrameAnalyticsApiProvider: (httpService: HttpService) => {
    getDataFrameAnalytics(analyticsId?: string, excludeGenerated?: boolean, size?: number): Promise<GetDataFrameAnalyticsResponse>;
    getDataFrameAnalyticsStats(analyticsId?: string): Promise<GetDataFrameAnalyticsStatsResponse>;
    createDataFrameAnalytics(analyticsId: string, analyticsConfig: DeepPartial<DataFrameAnalyticsConfig>, createDataView?: boolean, timeFieldName?: string): Promise<PutDataFrameAnalyticsResponseSchema>;
    updateDataFrameAnalytics(analyticsId: string, updateConfig: UpdateDataFrameAnalyticsConfig): Promise<any>;
    getDataFrameAnalyticsMap(id: string, treatAsRoot: boolean, type?: string): Promise<AnalyticsMapReturnType>;
    jobsExist(analyticsIds: string[], allSpaces?: boolean): Promise<JobsExistsResponse>;
    evaluateDataFrameAnalytics(evaluateConfig: any): Promise<any>;
    explainDataFrameAnalytics(jobConfig: DeepPartial<DataFrameAnalyticsConfig>): Promise<any>;
    deleteDataFrameAnalytics(analyticsId: string, force?: boolean): Promise<any>;
    deleteDataFrameAnalyticsAndDestIndex(analyticsId: string, deleteDestIndex: boolean, deleteDestDataView: boolean, force?: boolean): Promise<DeleteDataFrameAnalyticsWithIndexResponse>;
    startDataFrameAnalytics(analyticsId: string): Promise<any>;
    stopDataFrameAnalytics(analyticsId: string, force?: boolean): Promise<any>;
    getAnalyticsAuditMessages(analyticsId: string): Promise<JobMessage[]>;
    validateDataFrameAnalytics(analyticsConfig: DeepPartial<DataFrameAnalyticsConfig>): Promise<ValidateAnalyticsJobResponse>;
    newJobCapsAnalytics(indexPatternTitle: string, isRollup?: boolean): Promise<NewJobCapsResponse>;
};
export type DataFrameAnalyticsApiService = ReturnType<typeof dataFrameAnalyticsApiProvider>;
/**
 * Hooks for accessing {@link DataFrameAnalyticsApiService} in React components.
 */
export declare function useDataFrameAnalyticsApiService(): DataFrameAnalyticsApiService;
