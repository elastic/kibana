/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type {
  GetDataStreamSettingsParams,
  DataStreamSettings,
  GetDataStreamDetailsParams,
  DataStreamDetails,
  GetIntegrationDashboardsParams,
  GetDataStreamDegradedFieldsParams,
  DegradedFieldResponse,
  GetDataStreamDegradedFieldValuesPathParams,
  GetDataStreamFailedDocsDetailsParams,
  GetDataStreamFailedDocsErrorsParams,
  GetDataStreamNonAggregatableParams,
} from '../../../common/data_streams_stats';
import type {
  AnalyzeDegradedFieldsParams,
  IntegrationType,
  CheckAndLoadIntegrationParams,
  UpdateFieldLimitParams,
  UpdateFailureStoreParams,
} from '../../../common/data_stream_details/types';
import type {
  Dashboard,
  DataStreamRolloverResponse,
  DegradedFieldAnalysis,
  DegradedFieldValues,
  FailedDocsDetails,
  FailedDocsErrorsResponse,
  UpdateFieldLimitResponse,
  UpdateFailureStoreResponse,
  NonAggregatableDatasets,
} from '../../../common/api_types';
import type { ITelemetryClient } from '../telemetry';

export type DataStreamDetailsServiceSetup = void;

export interface DataStreamDetailsServiceStart {
  getClient: () => Promise<IDataStreamDetailsClient>;
}

export interface DataStreamDetailsServiceStartDeps {
  http: HttpStart;
  telemetryClient: ITelemetryClient;
}

export interface IDataStreamDetailsClient {
  getDataStreamSettings(params: GetDataStreamSettingsParams): Promise<DataStreamSettings>;
  getDataStreamDetails(params: GetDataStreamDetailsParams): Promise<DataStreamDetails>;
  getFailedDocsDetails(params: GetDataStreamFailedDocsDetailsParams): Promise<FailedDocsDetails>;
  getFailedDocsErrors(
    params: GetDataStreamFailedDocsErrorsParams
  ): Promise<FailedDocsErrorsResponse>;
  getDataStreamDegradedFields(
    params: GetDataStreamDegradedFieldsParams
  ): Promise<DegradedFieldResponse>;
  getDataStreamDegradedFieldValues(
    params: GetDataStreamDegradedFieldValuesPathParams
  ): Promise<DegradedFieldValues>;
  checkAndLoadIntegration(params: CheckAndLoadIntegrationParams): Promise<IntegrationType>;
  getIntegrationDashboards(params: GetIntegrationDashboardsParams): Promise<Dashboard[]>;
  analyzeDegradedField(params: AnalyzeDegradedFieldsParams): Promise<DegradedFieldAnalysis>;
  setNewFieldLimit(params: UpdateFieldLimitParams): Promise<UpdateFieldLimitResponse>;
  rolloverDataStream(params: { dataStream: string }): Promise<DataStreamRolloverResponse>;
  updateFailureStore(params: UpdateFailureStoreParams): Promise<UpdateFailureStoreResponse>;
  getNonAggregatableDatasets(
    params: GetDataStreamNonAggregatableParams
  ): Promise<NonAggregatableDatasets>;
}
