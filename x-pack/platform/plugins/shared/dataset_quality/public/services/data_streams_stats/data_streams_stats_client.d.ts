import type { HttpStart } from '@kbn/core/public';
import type { UpdateFailureStoreResponse } from '../../../common/api_types';
import type { DataStreamStatServiceResponse, GetDataStreamsDegradedDocsStatsQuery, GetDataStreamsFailedDocsStatsQuery, GetDataStreamsStatsQuery, GetDataStreamsTotalDocsQuery, GetDataStreamsTypesPrivilegesQuery, GetDataStreamsTypesPrivilegesResponse, GetNonAggregatableDataStreamsParams } from '../../../common/data_streams_stats';
import { Integration } from '../../../common/data_streams_stats/integration';
import type { IDataStreamsStatsClient } from './types';
import type { ITelemetryClient } from '../telemetry';
export declare class DataStreamsStatsClient implements IDataStreamsStatsClient {
    private readonly http;
    private readonly telemetryClient?;
    constructor(http: HttpStart, telemetryClient?: ITelemetryClient | undefined);
    getDataStreamsTypesPrivileges(params: GetDataStreamsTypesPrivilegesQuery): Promise<GetDataStreamsTypesPrivilegesResponse>;
    getDataStreamsStats(params: GetDataStreamsStatsQuery): Promise<DataStreamStatServiceResponse>;
    getDataStreamsTotalDocs(params: GetDataStreamsTotalDocsQuery): Promise<{
        dataset: string;
        count: number;
    }[]>;
    getDataStreamsDegradedStats(params: GetDataStreamsDegradedDocsStatsQuery): Promise<{
        dataset: string;
        count: number;
    }[]>;
    getDataStreamsFailedStats(params: GetDataStreamsFailedDocsStatsQuery): Promise<{
        dataset: string;
        count: number;
    }[]>;
    getNonAggregatableDatasets(params: GetNonAggregatableDataStreamsParams): Promise<{
        aggregatable: boolean;
        datasets: string[];
    }>;
    getIntegrations(): Promise<Integration[]>;
    updateFailureStore({ dataStream, failureStoreEnabled, customRetentionPeriod, }: {
        dataStream: string;
        failureStoreEnabled: boolean;
        customRetentionPeriod?: string;
    }): Promise<UpdateFailureStoreResponse>;
}
