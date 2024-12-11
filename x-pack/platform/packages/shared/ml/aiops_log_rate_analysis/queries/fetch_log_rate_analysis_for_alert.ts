/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { queue } from 'async';
import { chunk } from 'lodash';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { withSpan } from '@kbn/apm-utils';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { SignificantItem } from '@kbn/ml-agg-utils';
import { getSampleProbability } from '@kbn/ml-random-sampler-utils';

import type { AiopsLogRateAnalysisSchema } from '../api/schema';
import { getIntervalFactor } from '../get_log_rate_analysis_parameters_from_alert';
import { getSwappedWindowParameters } from '../get_swapped_window_parameters';
import { getLogRateChange } from '../get_log_rate_change';
import { getBaselineAndDeviationRates } from '../get_baseline_and_deviation_rates';
import { getLogRateAnalysisTypeForCounts } from '../get_log_rate_analysis_type_for_counts';
import { LOG_RATE_ANALYSIS_TYPE } from '../log_rate_analysis_type';

import { fetchIndexInfo } from './fetch_index_info';
import { fetchSignificantCategories } from './fetch_significant_categories';
import { fetchSignificantTermPValues } from './fetch_significant_term_p_values';

const MAX_CONCURRENT_QUERIES = 5;
const CHUNK_SIZE = 50;

interface QueueItem {
  fn: typeof fetchSignificantCategories | typeof fetchSignificantTermPValues;
  fieldNames: string[];
}

/**
 * Runs log rate analysis data on an index given some alert metadata.
 */
export async function fetchLogRateAnalysisForAlert({
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
  };
}) {
  const { alertStartedAt, timefield = '@timestamp' } = args;
  const alertStart = moment(alertStartedAt);

  const intervalFactor = getIntervalFactor(
    args.alertRuleParameterTimeSize,
    args.alertRuleParameterTimeUnit
  );

  // The deviation time range is 1 lookback duration before the alert start.
  // The baseline time range is 2 lookback durations before the deviation time range.
  const windowParameters = {
    baselineMin: alertStart
      .clone()
      .subtract(3 * intervalFactor, 'minutes')
      .valueOf(),
    baselineMax: alertStart
      .clone()
      .subtract(1 * intervalFactor, 'minutes')
      .valueOf(),
    deviationMin: alertStart
      .clone()
      .subtract(1 * intervalFactor, 'minutes')
      .valueOf(),
    deviationMax: alertStart.valueOf(),
  };

  const { searchQuery = { match_all: {} } } = args;

  // Step 1: Get field candidates and total doc counts.
  const indexInfoParams: AiopsLogRateAnalysisSchema = {
    index: args.index,
    start: windowParameters.baselineMin,
    end: windowParameters.deviationMax,
    searchQuery: JSON.stringify(searchQuery),
    timeFieldName: timefield,
    ...windowParameters,
  };

  const indexInfo = await withSpan(
    { name: 'fetch_index_info', type: 'aiops-log-rate-analysis-for-alert' },
    () =>
      fetchIndexInfo({
        esClient,
        abortSignal,
        arguments: {
          ...indexInfoParams,
          textFieldCandidatesOverrides: ['message', 'error.message'],
        },
      })
  );
  const { textFieldCandidates, keywordFieldCandidates } = indexInfo;

  const logRateAnalysisType = getLogRateAnalysisTypeForCounts({
    baselineCount: indexInfo.baselineTotalDocCount,
    deviationCount: indexInfo.deviationTotalDocCount,
    windowParameters,
  });

  // Just in case the log rate analysis type is 'dip', we need to swap
  // the window parameters for the analysis.
  const analysisWindowParameters =
    logRateAnalysisType === LOG_RATE_ANALYSIS_TYPE.SPIKE
      ? windowParameters
      : getSwappedWindowParameters(windowParameters);

  // Step 2: Identify significant items.
  // The following code will fetch significant categories and term p-values
  // using an async queue. The field candidates will be passed on as chunks
  // of 50 fields with up to 5 concurrent queries. This is to prevent running
  // into bucket limit issues if we'd throw possibly hundreds of field candidates
  // into a single query.

  const significantItems: SignificantItem[] = [];

  // Set up the queue: A queue item is an object with the function to call and
  // the field names to be passed to the function. This is done so we can push
  // queries for both keyword fields (using significant_terms/p-values) and
  // text fields (using categorize_text + custom code to identify significance)
  // into the same queue.
  const significantItemsQueue = queue(async function ({ fn, fieldNames }: QueueItem) {
    significantItems.push(
      ...(await fn({
        esClient,
        abortSignal,
        arguments: {
          ...indexInfoParams,
          ...analysisWindowParameters,
          fieldNames,
          sampleProbability: getSampleProbability(
            indexInfo.deviationTotalDocCount + indexInfo.baselineTotalDocCount
          ),
        },
      }))
    );
  }, MAX_CONCURRENT_QUERIES);

  // Push the actual items to the queue. We don't need to chunk the text fields
  // since they are just `message` and `error.message`.
  significantItemsQueue.push(
    [
      { fn: fetchSignificantCategories, fieldNames: textFieldCandidates },
      ...chunk(keywordFieldCandidates, CHUNK_SIZE).map((fieldNames) => ({
        fn: fetchSignificantTermPValues,
        fieldNames,
      })),
    ],
    (err) => {
      if (err) significantItemsQueue.kill();
    }
  );

  // Wait for the queue to finish.
  await withSpan(
    { name: 'fetch_significant_items', type: 'aiops-log-rate-analysis-for-alert' },
    () => significantItemsQueue.drain()
  );

  // RETURN DATA
  // Adapt the raw significant items data for contextual insights.
  return {
    logRateAnalysisType,
    significantItems: significantItems
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

        const fieldType = type === 'keyword' ? 'metadata' : 'log message pattern';

        const data = {
          fieldType,
          fieldName,
          fieldValue: String(fieldValue).substring(0, 140),
          logRateChange: getLogRateChange(
            logRateAnalysisType,
            baselineBucketRate,
            deviationBucketRate
          ).message,
        };

        return {
          logRateChangeSort: bgCount > 0 ? docCount / bgCount : docCount,
          data,
        };
      })
      .sort((a, b) => b.logRateChangeSort - a.logRateChangeSort)
      .map((d) => d.data),
  };
}
