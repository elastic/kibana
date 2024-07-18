/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { queue } from 'async';
import { chunk } from 'lodash';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { ElasticsearchClient } from '@kbn/core/server';
import type { SignificantItem } from '@kbn/ml-agg-utils';
import { getSampleProbability } from '@kbn/ml-random-sampler-utils';
import {
  isKeywordFieldCandidates,
  isTextFieldCandidates,
  type QueueFieldCandidate,
  QUEUE_CHUNKING_SIZE,
} from '../queue_field_candidates';

import type { AiopsLogRateAnalysisSchema } from '../api/schema';
import { getLogRateAnalysisParametersFromAlert } from '../get_log_rate_analysis_parameters_from_alert';
import { getSwappedWindowParameters } from '../get_swapped_window_parameters';
import { getLogRateChange } from '../get_log_rate_change';
import { getBaselineAndDeviationRates } from '../get_baseline_and_deviation_rates';
import { getLogRateAnalysisTypeForCounts } from '../get_log_rate_analysis_type_for_counts';

import { fetchIndexInfo } from './fetch_index_info';
import { fetchSignificantCategories } from './fetch_significant_categories';
import { fetchSignificantTermPValues } from './fetch_significant_term_p_values';

// Don't use more than 5 here otherwise Kibana will emit an error
// regarding a limit of abort signal listeners of more than 10.
const MAX_CONCURRENT_QUERIES = 5;

export interface LogRateChange {
  type: string;
  averageLogRateCount: number;
  logRateAggregationIntervalUsedForAnalysis: string;
  documentSamplingFactorForAnalysis?: number;
}

export interface SimpleSignificantItem {
  field: string;
  value: string | number;
  type: 'metadata' | 'log message pattern';
  documentCount: number;
  baselineCount: number;
  logRateChangeSort: number;
  logRateChange: string;
}

/**
 * Asynchronously fetches log rate analysis from an Elasticsearch client.
 * Use this function if you want to fetch log rate analysis in other contexts
 * than the Log Rate Analysis UI in the ML plugin UI.
 *
 * @param {Object} params - The parameters for fetching log rate analysis.
 * @param {ElasticsearchClient} params.esClient - The Elasticsearch client to use for the query.
 * @param {AbortSignal} [params.abortSignal] - An optional abort signal to cancel the request.
 * @param {Object} params.arguments - The arguments for the log rate analysis query.
 * @param {string} params.arguments.index - The index to query against.
 * @param {string} params.arguments.start - The start time for the query range.
 * @param {string} params.arguments.end - The end time for the query range.
 * @param {string} params.arguments.timefield - The field used to filter documents by time.
 * @param {string[]} [params.arguments.keywordFieldCandidates] - Optional list of fields to be considered as keyword fields.
 * @param {string[]} [params.arguments.textFieldCandidates] - Optional list of fields to be considered as text fields.
 *
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
export const fetchLogRateAnalysisForAlert = async ({
  esClient,
  abortSignal,
  arguments: args,
}: {
  esClient: ElasticsearchClient;
  abortSignal?: AbortSignal;
  arguments: {
    index: string;
    alertStartedAt: string;
    alertRuleParameterTimeSize?: number;
    alertRuleParameterTimeUnit?: string;
    timefield?: string;
    searchQuery?: estypes.QueryDslQueryContainer;
    keywordFieldCandidates?: string[];
    textFieldCandidates?: string[];
  };
}) => {
  const debugStartTime = Date.now();

  const { alertStartedAt, timefield = '@timestamp' } = args;

  const { timeRange, windowParameters } = getLogRateAnalysisParametersFromAlert({
    alertStartedAt,
    timeSize: args.alertRuleParameterTimeSize,
    timeUnit: args.alertRuleParameterTimeUnit as any,
  });
  const earliestMs = timeRange.min.valueOf();
  const latestMs = timeRange.max.valueOf();

  const rangeQuery: estypes.QueryDslQueryContainer = {
    range: {
      [timefield]: {
        gte: timeRange.min.valueOf(),
        lte: timeRange.max.valueOf(),
        format: 'epoch_millis',
      },
    },
  };

  const { keywordFieldCandidates = [], textFieldCandidates = [], searchQuery = rangeQuery } = args;

  if (searchQuery.bool && Array.isArray(searchQuery.bool.filter)) {
    searchQuery.bool.filter.push(rangeQuery);
  }

  // FIELD CANDIDATES

  const includeFieldCandidates =
    keywordFieldCandidates.length === 0 && textFieldCandidates.length === 0;

  const indexInfoParams: AiopsLogRateAnalysisSchema = {
    index: args.index,
    start: earliestMs,
    end: latestMs,
    searchQuery: JSON.stringify(searchQuery),
    timeFieldName: timefield,
    ...windowParameters,
  };

  const indexInfo = await fetchIndexInfo({
    esClient,
    abortSignal,
    arguments: {
      ...indexInfoParams,
      textFieldCandidatesOverrides: ['message', 'error.message'],
      skipFieldCandidates: !includeFieldCandidates,
    },
  });

  const logRateAnalysisType = getLogRateAnalysisTypeForCounts({
    baselineCount: indexInfo.baselineTotalDocCount,
    deviationCount: indexInfo.deviationTotalDocCount,
    windowParameters,
  });

  const analysisWindowParameters =
    logRateAnalysisType === 'spike'
      ? windowParameters
      : getSwappedWindowParameters(windowParameters);

  const params: AiopsLogRateAnalysisSchema = {
    ...indexInfoParams,
    ...analysisWindowParameters,
  };

  keywordFieldCandidates.push(...indexInfo.keywordFieldCandidates);
  textFieldCandidates.push(...indexInfo.textFieldCandidates);
  const sampleProbability = getSampleProbability(
    indexInfo.deviationTotalDocCount + indexInfo.baselineTotalDocCount
  );

  // SIGNIFICANT ITEMS

  const significantCategories: SignificantItem[] = [];
  const significantTerms: SignificantItem[] = [];
  const fieldsToSample = new Set<string>();

  const pValuesQueue = queue(async function (payload: QueueFieldCandidate) {
    if (isKeywordFieldCandidates(payload)) {
      const { keywordFieldCandidates: fieldNames } = payload;

      const pValues = await fetchSignificantTermPValues({
        esClient,
        abortSignal,
        arguments: {
          ...params,
          fieldNames,
          sampleProbability,
        },
      });

      if (pValues.length > 0) {
        pValues.forEach((d) => {
          fieldsToSample.add(d.fieldName);
        });
        significantTerms.push(...pValues);
      }
    } else if (isTextFieldCandidates(payload)) {
      const { textFieldCandidates: fieldNames } = payload;

      const significantCategoriesForField = await fetchSignificantCategories({
        esClient,
        abortSignal,
        arguments: {
          ...params,
          fieldNames,
          sampleProbability,
        },
      });

      if (significantCategoriesForField.length > 0) {
        significantCategories.push(...significantCategoriesForField);
      }
    }
  }, MAX_CONCURRENT_QUERIES);

  // This chunks keyword and text field candidates, then passes them on
  // to the async queue for processing. Each chunk will be part of a single
  // query using multiple aggs for each candidate. For many candidates,
  // on top of that the async queue will process multiple queries concurrently.
  pValuesQueue.push(
    [
      ...chunk(textFieldCandidates, QUEUE_CHUNKING_SIZE).map((d) => ({ textFieldCandidates: d })),
      ...chunk(keywordFieldCandidates, QUEUE_CHUNKING_SIZE).map((d) => ({
        keywordFieldCandidates: d,
      })),
    ],
    (err) => {
      if (err) {
        pValuesQueue.kill();
      }
    }
  );
  await pValuesQueue.drain();

  const debugEndTime = Date.now();
  const debugDelta = (debugEndTime - debugStartTime) / 1000;
  console.log(`Took: ${debugDelta}s`);

  // RETURN DATA

  const significantItems: SimpleSignificantItem[] = [...significantTerms, ...significantCategories]
    .filter(({ bg_count: bgCount, doc_count: docCount }) => {
      return docCount > bgCount;
    })
    .map(({ fieldName, fieldValue, type, doc_count: docCount, bg_count: bgCount }) => {
      const { baselineBucketRate, deviationBucketRate } = getBaselineAndDeviationRates(
        logRateAnalysisType,
        // Normalize the amount of baseline buckets based on treating the
        // devation duration as 1 bucket.
        (windowParameters.baselineMax - windowParameters.baselineMin) /
          (windowParameters.deviationMax - windowParameters.deviationMin),
        1,
        docCount,
        bgCount
      );

      return {
        field: fieldName,
        value: fieldValue,
        type: (type === 'keyword'
          ? 'metadata'
          : 'log message pattern') as SimpleSignificantItem['type'],
        documentCount: docCount,
        baselineCount: bgCount,
        logRateChangeSort: bgCount > 0 ? docCount / bgCount : docCount,
        logRateChange: getLogRateChange(
          logRateAnalysisType,
          baselineBucketRate,
          deviationBucketRate
        ).message,
      };
    })
    .sort((a, b) => b.logRateChangeSort - a.logRateChangeSort);

  return { significantItems };
};
