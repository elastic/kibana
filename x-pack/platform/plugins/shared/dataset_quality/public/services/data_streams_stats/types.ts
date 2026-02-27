/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type { UpdateFailureStoreParams } from '../../../common/data_stream_details';
import type {
  DataStreamDocsStat,
  NonAggregatableDatasets,
  UpdateFailureStoreResponse,
} from '../../../common/api_types';
import type {
  DataStreamStatServiceResponse,
  GetDataStreamsDegradedDocsStatsQuery,
  GetDataStreamsFailedDocsStatsQuery,
  GetDataStreamsStatsQuery,
  GetDataStreamsTotalDocsQuery,
  GetDataStreamsTypesPrivilegesQuery,
  GetDataStreamsTypesPrivilegesResponse,
  GetNonAggregatableDataStreamsParams,
} from '../../../common/data_streams_stats';
import type { Integration } from '../../../common/data_streams_stats/integration';
import type { ITelemetryClient } from '../telemetry';

export type DataStreamsStatsServiceSetup = void;

export interface DataStreamsStatsServiceStart {
  getClient: () => Promise<IDataStreamsStatsClient>;
}

export interface DataStreamsStatsServiceStartDeps {
  http: HttpStart;
  telemetryClient?: ITelemetryClient;
}

export interface IDataStreamsStatsClient {
  getDataStreamsTypesPrivileges(
    params: GetDataStreamsTypesPrivilegesQuery
  ): Promise<GetDataStreamsTypesPrivilegesResponse>;
  getDataStreamsStats(params?: GetDataStreamsStatsQuery): Promise<DataStreamStatServiceResponse>;
  getDataStreamsDegradedStats(
    params?: GetDataStreamsDegradedDocsStatsQuery
  ): Promise<DataStreamDocsStat[]>;
  getDataStreamsFailedStats(
    params?: GetDataStreamsFailedDocsStatsQuery
  ): Promise<DataStreamDocsStat[]>;
  getDataStreamsTotalDocs(params: GetDataStreamsTotalDocsQuery): Promise<DataStreamDocsStat[]>;
  getIntegrations(): Promise<Integration[]>;
  getNonAggregatableDatasets(
    params: GetNonAggregatableDataStreamsParams
  ): Promise<NonAggregatableDatasets>;
  updateFailureStore(params: UpdateFailureStoreParams): Promise<UpdateFailureStoreResponse>;
}
