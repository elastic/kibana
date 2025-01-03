/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { estypes } from '@elastic/elasticsearch';
import { getLogErrorRate, getLogRatePerMinute } from '../../utils';
import { LOG_LEVEL } from '../../es_fields';

export interface LogsRatesServiceParams {
  esClient: ElasticsearchClient;
  serviceNames: string[];
  identifyingMetadata: string;
  timeFrom: number;
  timeTo: number;
}

interface LogErrorsAggregation extends estypes.AggregationsStringRareTermsBucketKeys {
  logErrors: estypes.AggregationsTermsAggregateBase<estypes.AggregationsStringRareTermsBucketKeys>;
}

interface LogRateQueryAggregation {
  services: estypes.AggregationsTermsAggregateBase<LogErrorsAggregation>;
}

export interface LogsRatesMetrics {
  logRatePerMinute: number;
  logErrorRate: null | number;
}

export interface LogsRatesServiceReturnType {
  [serviceName: string]: LogsRatesMetrics;
}

export function createGetLogsRatesService() {
  return async ({
    esClient,
    identifyingMetadata,
    serviceNames,
    timeFrom,
    timeTo,
  }: LogsRatesServiceParams): Promise<LogsRatesServiceReturnType> => {
    const esResponse = await esClient.search({
      index: 'logs-*-*',
      size: 0,
      query: {
        bool: {
          filter: [
            {
              exists: {
                // For now, we don't want to count APM server logs or any other logs that don't have the log.level field.
                field: LOG_LEVEL,
              },
            },
            {
              terms: {
                [identifyingMetadata]: serviceNames,
              },
            },
            {
              range: {
                ['@timestamp']: {
                  gte: timeFrom,
                  lte: timeTo,
                  format: 'epoch_millis',
                },
              },
            },
          ],
        },
      },
      aggs: {
        services: {
          terms: {
            field: identifyingMetadata,
          },
          aggs: {
            logErrors: {
              terms: {
                field: LOG_LEVEL,
                include: ['error', 'ERROR'],
              },
            },
          },
        },
      },
    });
    const aggregations = esResponse.aggregations as LogRateQueryAggregation | undefined;
    const buckets = aggregations?.services.buckets as LogErrorsAggregation[] | undefined;

    return buckets
      ? buckets.reduce<LogsRatesServiceReturnType>((acc, bucket) => {
          const logCount = bucket.doc_count;
          const logErrorBuckets = bucket.logErrors
            .buckets as estypes.AggregationsStringRareTermsBucketKeys[];

          const logErrorCount = logErrorBuckets[0]?.doc_count;

          return {
            ...acc,
            [bucket.key]: {
              logRatePerMinute: getLogRatePerMinute({ logCount, timeFrom, timeTo }),
              logErrorRate: logErrorCount ? getLogErrorRate({ logCount, logErrorCount }) : null,
            },
          };
        }, {})
      : {};
  };
}
