import type { HttpStart } from '@kbn/core/public';
import type { DataStreamRolloverResponse, DegradedFieldAnalysis, DegradedFieldValues, FailedDocsErrorsResponse, UpdateFieldLimitResponse, UpdateFailureStoreResponse, NonAggregatableDatasets } from '../../../common/api_types';
import type { GetDataStreamDegradedFieldsParams, GetDataStreamDegradedFieldValuesPathParams, GetDataStreamDetailsParams, GetDataStreamFailedDocsDetailsParams, GetDataStreamFailedDocsErrorsParams, GetDataStreamNonAggregatableParams, GetDataStreamSettingsParams, GetIntegrationDashboardsParams } from '../../../common/data_streams_stats';
import type { IDataStreamDetailsClient } from './types';
import { Integration } from '../../../common/data_streams_stats/integration';
import type { AnalyzeDegradedFieldsParams, CheckAndLoadIntegrationParams, UpdateFieldLimitParams } from '../../../common/data_stream_details/types';
import type { ITelemetryClient } from '../telemetry';
export declare class DataStreamDetailsClient implements IDataStreamDetailsClient {
    private readonly http;
    private readonly telemetryClient;
    constructor(http: HttpStart, telemetryClient: ITelemetryClient);
    getDataStreamSettings({ dataStream }: GetDataStreamSettingsParams): Promise<{
        lastBackingIndexName?: string | undefined;
        indexTemplate?: string | undefined;
        createdOn?: number | null | undefined;
        integration?: string | undefined;
        datasetUserPrivileges?: {
            datasetsPrivilages: {
                [x: string]: {
                    canMonitor: boolean;
                    canReadFailureStore: boolean;
                    canManageFailureStore: boolean;
                } & {
                    canRead: boolean;
                };
            };
            canViewIntegrations: boolean;
        } | undefined;
    }>;
    getDataStreamDetails({ dataStream, start, end }: GetDataStreamDetailsParams): Promise<{
        hasFailureStore?: boolean | undefined;
        lastActivity?: number | undefined;
        degradedDocsCount?: number | undefined;
        failedDocsCount?: number | undefined;
        docsCount?: number | undefined;
        sizeBytes?: number | undefined;
        services?: {
            [x: string]: string[];
        } | undefined;
        hosts?: {
            [x: string]: string[];
        } | undefined;
        userPrivileges?: {
            canMonitor: boolean;
            canReadFailureStore: boolean;
            canManageFailureStore: boolean;
        } | undefined;
        defaultRetentionPeriod?: string | undefined;
        customRetentionPeriod?: string | undefined;
        isServerless?: boolean | undefined;
    }>;
    getFailedDocsDetails({ dataStream, start, end, }: GetDataStreamFailedDocsDetailsParams): Promise<{
        count: number;
        lastOccurrence: number | null | undefined;
        timeSeries: {
            x: number;
            y: number;
        }[];
    }>;
    getFailedDocsErrors({ dataStream, start, end, }: GetDataStreamFailedDocsErrorsParams): Promise<FailedDocsErrorsResponse>;
    getDataStreamDegradedFields({ dataStream, start, end, }: GetDataStreamDegradedFieldsParams): Promise<{
        degradedFields: ({
            count: number;
            lastOccurrence: number | null | undefined;
            timeSeries: {
                x: number;
                y: number;
            }[];
        } & {
            name: string;
            indexFieldWasLastPresentIn: string;
        })[];
    }>;
    getDataStreamDegradedFieldValues({ dataStream, degradedField, }: GetDataStreamDegradedFieldValuesPathParams): Promise<DegradedFieldValues>;
    checkAndLoadIntegration({ dataStream }: CheckAndLoadIntegrationParams): Promise<{
        integration: Integration | undefined;
        isIntegration: false;
        areAssetsAvailable: boolean;
    } | {
        integration: Integration | undefined;
        isIntegration: true;
        areAssetsAvailable: true;
    }>;
    getIntegrationDashboards({ integration }: GetIntegrationDashboardsParams): Promise<{
        id: string;
        title: string;
    }[]>;
    analyzeDegradedField({ dataStream, degradedField, lastBackingIndex, }: AnalyzeDegradedFieldsParams): Promise<DegradedFieldAnalysis>;
    setNewFieldLimit({ dataStream, newFieldLimit, }: UpdateFieldLimitParams): Promise<UpdateFieldLimitResponse>;
    rolloverDataStream({ dataStream, }: {
        dataStream: string;
    }): Promise<DataStreamRolloverResponse>;
    updateFailureStore({ dataStream, failureStoreEnabled, customRetentionPeriod, }: {
        dataStream: string;
        failureStoreEnabled: boolean;
        customRetentionPeriod?: string;
    }): Promise<UpdateFailureStoreResponse>;
    getNonAggregatableDatasets(params: GetDataStreamNonAggregatableParams): Promise<NonAggregatableDatasets>;
}
