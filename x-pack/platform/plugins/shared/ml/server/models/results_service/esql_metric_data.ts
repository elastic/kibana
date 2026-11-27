/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import type { MetricData } from '@kbn/ml-common-types/results';
import {
  buildEsqlCardinalityRequest,
  buildEsqlMaxBucketCardinalityRequest,
  buildEsqlMetricRequest,
  getEsqlCardinalityColumn,
  isEsqlDatafeed,
  parseEsqlMetricResponse,
  type EsqlEntityField,
  type EsqlRequest,
} from '../../../common/util/esql_metric_query';
import type { MlClient } from '../../lib/ml_client';
import { datafeedsProvider } from '../job_service/datafeeds';

export interface EsqlMetricDataParams {
  readonly entityFields: readonly EsqlEntityField[];
  readonly metricFunction: string | null;
  readonly metricFieldName?: string;
  readonly earliestMs: number;
  readonly latestMs: number;
  readonly intervalMs: number;
}

export interface EsqlMetricDataForJobParams extends EsqlMetricDataParams {
  readonly jobId: string;
}

// Run the chart queries against the same projects as the datafeed in cross-project search.
const getProjectRouting = ({ project_routing: projectRouting }: Datafeed) =>
  projectRouting ? { project_routing: projectRouting } : {};

/** Fetches source data chart values and entity cardinalities for jobs with ES|QL datafeeds. */
export const esqlMetricDataProvider = (client: IScopedClusterClient) => {
  const { asCurrentUser } = client;

  /** Runs the datafeed's ES|QL query re-bucketed to the chart interval. */
  const fetchEsqlMetricData = async (
    datafeed: Datafeed,
    timeField: string,
    params: EsqlMetricDataParams
  ): Promise<MetricData> => {
    if (isEsqlDatafeed(datafeed) === false) {
      throw Boom.badRequest(`Datafeed [${datafeed.datafeed_id}] does not use an ES|QL query`);
    }

    const options = {
      ...params,
      esqlQuery: datafeed.esql_query,
      timeField,
    };
    const request = buildEsqlMetricRequest(options);
    if (request === undefined) {
      throw Boom.badRequest(
        `Function [${params.metricFunction}] cannot be charted for ES|QL datafeed [${datafeed.datafeed_id}]`
      );
    }

    const response = await asCurrentUser.esql.query(
      { ...request, ...getProjectRouting(datafeed) },
      { maxRetries: 0 }
    );

    return {
      success: true,
      // Empty buckets are null for non-count functions, which the charts treat as gaps.
      results: parseEsqlMetricResponse(response, options) as Record<string, number>,
    };
  };

  // Runs a cardinality request and reads the value of each field from its single row
  const fetchCardinalities = async (
    datafeed: Datafeed,
    request: EsqlRequest,
    fieldNames: readonly string[]
  ): Promise<Record<string, number>> => {
    const { columns, values } = await asCurrentUser.esql.query(
      { ...request, ...getProjectRouting(datafeed) },
      { maxRetries: 0 }
    );
    const [row = []] = values;

    return fieldNames.reduce<Record<string, number>>((acc, fieldName, index) => {
      const columnIndex = columns.findIndex(({ name }) => name === getEsqlCardinalityColumn(index));
      const value = columnIndex === -1 ? undefined : row[columnIndex];
      if (typeof value === 'number') {
        acc[fieldName] = value;
      }
      return acc;
    }, {});
  };

  /** Counts the distinct values of ES|QL output columns over the time window. */
  const fetchEsqlCardinalityOfFields = async (
    datafeed: Datafeed,
    timeField: string,
    fieldNames: readonly string[],
    earliestMs: number,
    latestMs: number
  ): Promise<Record<string, number>> => {
    if (isEsqlDatafeed(datafeed) === false || fieldNames.length === 0) {
      return {};
    }

    const request = buildEsqlCardinalityRequest({
      esqlQuery: datafeed.esql_query,
      timeField,
      fieldNames,
      earliestMs,
      latestMs,
    });
    return fetchCardinalities(datafeed, request, fieldNames);
  };

  /** Finds the most distinct values of ES|QL output columns in any one bucket of the time window. */
  const fetchEsqlMaxBucketCardinalities = async (
    datafeed: Datafeed,
    timeField: string,
    fieldNames: readonly string[],
    earliestMs: number,
    latestMs: number,
    intervalMs: number
  ): Promise<Record<string, number>> => {
    if (isEsqlDatafeed(datafeed) === false || fieldNames.length === 0) {
      return {};
    }

    const request = buildEsqlMaxBucketCardinalityRequest({
      esqlQuery: datafeed.esql_query,
      timeField,
      fieldNames,
      earliestMs,
      latestMs,
      intervalMs,
    });
    return fetchCardinalities(datafeed, request, fieldNames);
  };

  return { fetchEsqlMetricData, fetchEsqlCardinalityOfFields, fetchEsqlMaxBucketCardinalities };
};

/**
 * Loads the job and its ES|QL datafeed and returns source data chart values. The ES|QL query
 * text always comes from the stored datafeed, never from the request.
 */
export const getEsqlMetricDataForJob = async (
  client: IScopedClusterClient,
  mlClient: MlClient,
  { jobId, ...params }: EsqlMetricDataForJobParams
): Promise<MetricData> => {
  const { jobs } = await mlClient.getJobs({ job_id: jobId });
  const [job] = jobs;
  const timeField = job?.data_description?.time_field;
  if (job === undefined || timeField === undefined) {
    throw Boom.notFound(`Job [${jobId}] not found`);
  }

  const datafeed = await datafeedsProvider(client, mlClient).getDatafeedByJobId(jobId);
  if (datafeed === undefined) {
    throw Boom.notFound(`Datafeed for job [${jobId}] not found`);
  }

  return esqlMetricDataProvider(client).fetchEsqlMetricData(datafeed, timeField, params);
};
