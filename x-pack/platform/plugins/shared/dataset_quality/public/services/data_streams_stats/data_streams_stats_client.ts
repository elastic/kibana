/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import rison from '@kbn/rison';
import type {
  DataStreamDegradedDocsResponse,
  DataStreamFailedDocsResponse,
  DataStreamTotalDocsResponse,
  IntegrationsResponse,
  NonAggregatableDatasets,
  UpdateFailureStoreResponse,
} from '../../../common/api_types';
import {
  getDataStreamDegradedDocsResponseRt,
  getDataStreamFailedDocsResponseRt,
  getDataStreamsStatsResponseRt,
  getDataStreamsTypesPrivilegesResponseRt,
  getDataStreamTotalDocsResponseRt,
  getIntegrationsResponseRt,
  getNonAggregatableDatasetsRt,
  updateFailureStoreResponseRt,
} from '../../../common/api_types';
import { KNOWN_TYPES } from '../../../common/constants';
import type {
  DataStreamStatServiceResponse,
  GetDataStreamsDegradedDocsStatsQuery,
  GetDataStreamsFailedDocsStatsQuery,
  GetDataStreamsStatsQuery,
  GetDataStreamsStatsResponse,
  GetDataStreamsTotalDocsQuery,
  GetDataStreamsTypesPrivilegesQuery,
  GetDataStreamsTypesPrivilegesResponse,
  GetNonAggregatableDataStreamsParams,
} from '../../../common/data_streams_stats';
import { Integration } from '../../../common/data_streams_stats/integration';
import { DatasetQualityError } from '../../../common/errors';
import type { IDataStreamsStatsClient } from './types';
import type { ITelemetryClient } from '../telemetry';

export class DataStreamsStatsClient implements IDataStreamsStatsClient {
  constructor(
    private readonly http: HttpStart,
    private readonly telemetryClient?: ITelemetryClient
  ) {}

  public async getDataStreamsTypesPrivileges(
    params: GetDataStreamsTypesPrivilegesQuery
  ): Promise<GetDataStreamsTypesPrivilegesResponse> {
    const types =
      'types' in params
        ? rison.encodeArray(params.types.length === 0 ? KNOWN_TYPES : params.types)
        : undefined;

    const response = await this.http
      .get<GetDataStreamsTypesPrivilegesResponse>(
        '/internal/dataset_quality/data_streams/types_privileges',
        {
          query: {
            ...params,
            types,
          },
        }
      )
      .catch((error) => {
        throw new DatasetQualityError(
          `Failed to fetch data streams types privileges: ${error}`,
          error
        );
      });

    const { datasetTypesPrivileges } = decodeOrThrow(
      getDataStreamsTypesPrivilegesResponseRt,
      (message: string) =>
        new DatasetQualityError(`Failed to decode data streams types privileges: ${message}`)
    )(response);

    return { datasetTypesPrivileges };
  }

  public async getDataStreamsStats(
    params: GetDataStreamsStatsQuery
  ): Promise<DataStreamStatServiceResponse> {
    const types =
      'types' in params
        ? rison.encodeArray(params.types.length === 0 ? KNOWN_TYPES : params.types)
        : undefined;
    const response = await this.http
      .get<GetDataStreamsStatsResponse>('/internal/dataset_quality/data_streams/stats', {
        query: {
          ...params,
          types,
        },
      })
      .catch((error) => {
        throw new DatasetQualityError(`Failed to fetch data streams stats: ${error}`, error);
      });

    const { dataStreamsStats, datasetUserPrivileges } = decodeOrThrow(
      getDataStreamsStatsResponseRt,
      (message: string) =>
        new DatasetQualityError(`Failed to decode data streams stats response: ${message}`)
    )(response);

    return { dataStreamsStats, datasetUserPrivileges };
  }

  public async getDataStreamsTotalDocs(params: GetDataStreamsTotalDocsQuery) {
    const response = await this.http
      .get<DataStreamTotalDocsResponse>('/internal/dataset_quality/data_streams/total_docs', {
        query: {
          ...params,
        },
      })
      .catch((error) => {
        throw new DatasetQualityError(`Failed to fetch data streams total docs: ${error}`, error);
      });

    const { totalDocs } = decodeOrThrow(
      getDataStreamTotalDocsResponseRt,
      (message: string) =>
        new DatasetQualityError(
          `Failed to decode data streams total docs stats response: ${message}`
        )
    )(response);

    return totalDocs;
  }

  public async getDataStreamsDegradedStats(params: GetDataStreamsDegradedDocsStatsQuery) {
    const response = await this.http
      .get<DataStreamDegradedDocsResponse>('/internal/dataset_quality/data_streams/degraded_docs', {
        query: {
          ...params,
          types: rison.encodeArray(params.types),
        },
      })
      .catch((error) => {
        throw new DatasetQualityError(
          `Failed to fetch data streams degraded stats: ${error}`,
          error
        );
      });

    const { degradedDocs } = decodeOrThrow(
      getDataStreamDegradedDocsResponseRt,
      (message: string) =>
        new DatasetQualityError(
          `Failed to decode data streams degraded docs stats response: ${message}`
        )
    )(response);

    return degradedDocs;
  }

  public async getDataStreamsFailedStats(params: GetDataStreamsFailedDocsStatsQuery) {
    const response = await this.http
      .get<DataStreamFailedDocsResponse>('/internal/dataset_quality/data_streams/failed_docs', {
        query: {
          ...params,
          types: rison.encodeArray(params.types),
        },
      })
      .catch((error) => {
        throw new DatasetQualityError(`Failed to fetch data streams failed stats: ${error}`, error);
      });

    const { failedDocs } = decodeOrThrow(
      getDataStreamFailedDocsResponseRt,
      (message: string) =>
        new DatasetQualityError(
          `Failed to decode data streams failed docs stats response: ${message}`
        )
    )(response);

    return failedDocs;
  }

  public async getNonAggregatableDatasets(params: GetNonAggregatableDataStreamsParams) {
    const response = await this.http
      .get<NonAggregatableDatasets>('/internal/dataset_quality/data_streams/non_aggregatable', {
        query: {
          ...params,
          types: rison.encodeArray(params.types),
        },
      })
      .catch((error) => {
        throw new DatasetQualityError(`Failed to fetch non aggregatable datasets: ${error}`, error);
      });

    const nonAggregatableDatasets = decodeOrThrow(
      getNonAggregatableDatasetsRt,
      (message: string) =>
        new DatasetQualityError(`Failed to fetch non aggregatable datasets: ${message}`)
    )(response);

    return nonAggregatableDatasets;
  }

  public async getIntegrations(): Promise<Integration[]> {
    const response = await this.http
      .get<IntegrationsResponse>('/internal/dataset_quality/integrations')
      .catch((error) => {
        throw new DatasetQualityError(`Failed to fetch integrations: ${error}`, error);
      });

    const { integrations } = decodeOrThrow(
      getIntegrationsResponseRt,
      (message: string) =>
        new DatasetQualityError(`Failed to decode integrations response: ${message}`)
    )(response);

    return integrations.map(Integration.create);
  }

  public async updateFailureStore({
    dataStream,
    failureStoreEnabled,
    customRetentionPeriod,
  }: {
    dataStream: string;
    failureStoreEnabled: boolean;
    customRetentionPeriod?: string;
  }): Promise<UpdateFailureStoreResponse> {
    const response = await this.http
      .put<UpdateFailureStoreResponse>(
        `/internal/dataset_quality/data_streams/${dataStream}/update_failure_store`,
        {
          body: JSON.stringify({
            failureStoreEnabled,
            customRetentionPeriod,
          }),
        }
      )
      .catch((error) => {
        throw new DatasetQualityError(`Failed to update failure store": ${error}`, error);
      });

    this.telemetryClient?.trackFailureStoreUpdated({
      data_stream_name: dataStream,
      failure_store_enabled: failureStoreEnabled,
      custom_retention_period: customRetentionPeriod,
    });

    return decodeOrThrow(
      updateFailureStoreResponseRt,
      (message: string) =>
        new DatasetQualityError(`Failed to decode update failure store response: ${message}"`)
    )(response);
  }
}
