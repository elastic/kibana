/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { queue } from 'async';
import { mean } from 'd3-array';
import moment from 'moment';

import dateMath from '@kbn/datemath';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { SignificantItem } from '@kbn/ml-agg-utils';
import { getSampleProbability } from '@kbn/ml-random-sampler-utils';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import type { AiopsLogRateAnalysisSchema } from '../api/schema';

import { fetchChangePointDetection } from './fetch_change_point_detection';
import { fetchIndexInfo } from './fetch_index_info';
import { fetchSignificantCategories } from './fetch_significant_categories';
import { fetchSignificantTermPValues } from './fetch_significant_term_p_values';

// Don't use more than 5 here otherwise Kibana will emit an error
// regarding a limit of abort signal listeners of more than 10.
const MAX_CONCURRENT_QUERIES = 5;

interface KeywordFieldCandidate {
  keywordFieldCandidate: string;
}
const isKeywordFieldCandidate = (d: unknown): d is KeywordFieldCandidate =>
  isPopulatedObject(d, ['keywordFieldCandidate']);

interface TextFieldCandidate {
  textFieldCandidate: string;
}
const isTextFieldCandidate = (d: unknown): d is TextFieldCandidate =>
  isPopulatedObject(d, ['textFieldCandidate']);

type QueueFieldCandidate = KeywordFieldCandidate | TextFieldCandidate;

export interface LogRateChange {
  type: string;
  timestamp: number;
  logRateChangeCount: number;
  averageLogRateCount: number;
  logRateAggregationIntervalUsedForAnalysis: string;
  documentSamplingFactorForAnalysis?: number;
  extendedChangePoint: { startTs: number; endTs: number };
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
 * Fetches log rate analysis data.
 *
 * @param esClient Elasticsearch client.
 * @param index The Elasticsearch source index pattern.
 * @param start The start of the time range, in Elasticsearch date math, like `now`.
 * @param end The end of the time range, in Elasticsearch date math, like `now-24h`.
 * @param timefield The Elasticesarch source index pattern time field.
 * @param abortSignal Abort signal.
 * @param keywordFieldCandidates Optional keyword field candidates.
 * @param textFieldCandidates Optional text field candidates.
 * @returns Log rate analysis data.
 */
export const fetchSimpleLogRateAnalysis = async (
  esClient: ElasticsearchClient,
  index: string,
  start: string,
  end: string,
  timefield: string,
  abortSignal?: AbortSignal,
  keywordFieldCandidates: string[] = [],
  textFieldCandidates: string[] = []
) => {
  const debugStartTime = Date.now();

  const earliestMs = dateMath.parse(start)?.valueOf();
  const latestMs = dateMath.parse(end, { roundUp: true })?.valueOf();

  if (earliestMs === undefined || latestMs === undefined) {
    throw new Error('Could not parse time range');
  }

  const searchQuery = {
    range: {
      [timefield]: {
        gte: earliestMs,
        lte: latestMs,
        format: 'epoch_millis',
      },
    },
  };

  // CHANGE POINT DETECTION
  const [error, resp] = await fetchChangePointDetection(
    esClient,
    index,
    earliestMs,
    latestMs,
    timefield,
    searchQuery,
    abortSignal
  );

  if (error !== null) {
    throw new Error(error);
  }

  const { changePoint, changePointDocCount, dateHistogramBuckets, intervalMs, windowParameters } =
    resp;

  // FIELD CANDIDATES

  const includeFieldCandidates =
    keywordFieldCandidates.length === 0 && textFieldCandidates.length === 0;

  const indexInfoParams: AiopsLogRateAnalysisSchema = {
    index,
    start: earliestMs,
    end: latestMs,
    searchQuery: JSON.stringify(searchQuery),
    timeFieldName: timefield,
    ...windowParameters,
  };

  const indexInfo = await fetchIndexInfo(
    esClient,
    indexInfoParams,
    ['message', 'error.message'],
    abortSignal,
    includeFieldCandidates
  );

  const baselineNumBuckets =
    (windowParameters.baselineMax - windowParameters.baselineMin) / intervalMs;
  const baselinePerBucket = indexInfo.baselineTotalDocCount / baselineNumBuckets;

  const deviationNumBuckets =
    (windowParameters.deviationMax - windowParameters.deviationMin) / intervalMs;
  const deviationPerBucket = indexInfo.deviationTotalDocCount / deviationNumBuckets;

  const analysisWindowParameters =
    deviationPerBucket > baselinePerBucket
      ? windowParameters
      : {
          baselineMin: windowParameters.deviationMin,
          baselineMax: windowParameters.deviationMax,
          deviationMin: windowParameters.baselineMin,
          deviationMax: windowParameters.baselineMax,
        };

  const logRateType = deviationPerBucket > baselinePerBucket ? 'spike' : 'dip';

  const params: AiopsLogRateAnalysisSchema = {
    ...indexInfoParams,
    ...analysisWindowParameters,
  };

  keywordFieldCandidates.push(...indexInfo.fieldCandidates);
  textFieldCandidates.push(...indexInfo.textFieldCandidates);
  const sampleProbability = getSampleProbability(
    indexInfo.deviationTotalDocCount + indexInfo.baselineTotalDocCount
  );

  // SIGNIFICANT ITEMS

  // This will store the combined count of detected significant log patterns and keywords
  let fieldValuePairsCount = 0;

  const significantCategories: SignificantItem[] = [];
  const significantTerms: SignificantItem[] = [];
  const fieldsToSample = new Set<string>();

  const pValuesQueue = queue(async function (payload: QueueFieldCandidate) {
    if (isKeywordFieldCandidate(payload)) {
      const { keywordFieldCandidate } = payload;
      let pValues: Awaited<ReturnType<typeof fetchSignificantTermPValues>> = [];

      pValues = await fetchSignificantTermPValues(
        esClient,
        params,
        [keywordFieldCandidate],
        undefined,
        sampleProbability,
        undefined,
        abortSignal
      );

      if (pValues.length > 0) {
        pValues.forEach((d) => {
          fieldsToSample.add(d.fieldName);
        });
        significantTerms.push(...pValues);
      }
    } else if (isTextFieldCandidate(payload)) {
      const { textFieldCandidate } = payload;

      const significantCategoriesForField = await fetchSignificantCategories(
        esClient,
        params,
        [textFieldCandidate],
        undefined,
        sampleProbability,
        undefined,
        abortSignal
      );

      if (significantCategoriesForField.length > 0) {
        significantCategories.push(...significantCategoriesForField);
      }
    }
  }, MAX_CONCURRENT_QUERIES);

  pValuesQueue.push(
    [
      ...textFieldCandidates.map((d) => ({ textFieldCandidate: d })),
      ...keywordFieldCandidates.map((d) => ({ keywordFieldCandidate: d })),
    ],
    (err) => {
      if (err) {
        pValuesQueue.kill();
      }
    }
  );
  await pValuesQueue.drain();

  fieldValuePairsCount = significantCategories.length + significantTerms.length;

  const debugEndTime = Date.now();
  const debugDelta = (debugEndTime - debugStartTime) / 1000;
  console.log(`Took: ${debugDelta}s`);

  // RETURN DATA

  const logRateChange: LogRateChange = {
    type: logRateType,
    timestamp: changePoint.key,
    logRateChangeCount: changePointDocCount,
    averageLogRateCount: Math.round(mean(Object.values(dateHistogramBuckets)) ?? 0),
    logRateAggregationIntervalUsedForAnalysis: moment
      .duration(Math.round(intervalMs / 1000), 'seconds')
      .humanize(),
    ...(sampleProbability < 1 ? { documentSamplingFactorForAnalysis: sampleProbability } : {}),
    extendedChangePoint: {
      startTs: changePoint.startTs,
      endTs: changePoint.endTs,
    },
  };

  if (fieldValuePairsCount === 0) {
    return { logRateChange, significantItems: [], dateHistogramBuckets, windowParameters };
  }

  const significantItems: SimpleSignificantItem[] = [...significantTerms, ...significantCategories]
    .filter(({ bg_count: bgCount, doc_count: docCount }) => {
      return docCount > bgCount;
    })
    .map(({ fieldName, fieldValue, type, doc_count: docCount, bg_count: bgCount }) => ({
      field: fieldName,
      value: fieldValue,
      type: (type === 'keyword'
        ? 'metadata'
        : 'log message pattern') as SimpleSignificantItem['type'],
      documentCount: docCount,
      baselineCount: bgCount,
      logRateChangeSort: bgCount > 0 ? docCount / bgCount : docCount,
      logRateChange:
        bgCount > 0
          ? logRateType === 'spike'
            ? `${Math.round((docCount / bgCount) * 100) / 100}x increase`
            : `${Math.round((bgCount / docCount) * 100) / 100}x decrease`
          : logRateType === 'spike'
          ? `${docCount} docs up from 0 in baseline`
          : `0 docs down from ${docCount} in baseline`,
    }))
    .sort((a, b) => b.logRateChangeSort - a.logRateChangeSort);

  return { logRateChange, significantItems, dateHistogramBuckets, windowParameters };
};
