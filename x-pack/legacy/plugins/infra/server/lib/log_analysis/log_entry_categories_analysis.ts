/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, RequestHandlerContext } from '../../../../../../../src/core/server';
import { getJobId, logEntryCategoriesJobTypes } from '../../../common/log_analysis';
import { startTracingSpan } from '../../../common/performance_tracing';
import { decodeOrThrow } from '../../../common/runtime_types';
import { KibanaFramework } from '../adapters/framework/kibana_framework_adapter';
import { NoLogAnalysisResultsIndexError } from './errors';
import { createTopLogEntryCategoriesQuery, topLogEntryCategoriesResponseRT } from './queries';
import {
  createLogEntryCategoriesQuery,
  logEntryCategoriesResponseRT,
  LogEntryCategoryHit,
} from './queries/log_entry_categories';
import {
  createLogEntryCategoryHistogramsQuery,
  logEntryCategoryHistogramsResponseRT,
} from './queries/log_entry_category_histograms';

export class LogEntryCategoriesAnalysis {
  constructor(
    private readonly libs: {
      framework: KibanaFramework;
    }
  ) {}

  public async getTopLogEntryCategories(
    requestContext: RequestHandlerContext,
    request: KibanaRequest,
    sourceId: string,
    startTime: number,
    endTime: number,
    categoryCount: number,
    histograms: HistogramParameters[]
  ) {
    const finalizeTopLogEntryCategoriesSpan = startTracingSpan('get top categories');

    const logEntryCategoriesCountJobId = getJobId(
      this.libs.framework.getSpaceId(request),
      sourceId,
      logEntryCategoriesJobTypes[0]
    );

    const {
      topLogEntryCategories,
      timing: { spans: fetchTopLogEntryCategoriesAggSpans },
    } = await this.fetchTopLogEntryCategories(
      requestContext,
      logEntryCategoriesCountJobId,
      startTime,
      endTime,
      categoryCount
    );

    const categoryIds = topLogEntryCategories.map(({ categoryId }) => categoryId);

    const {
      logEntryCategoriesById,
      timing: { spans: fetchTopLogEntryCategoryPatternsSpans },
    } = await this.fetchLogEntryCategories(
      requestContext,
      logEntryCategoriesCountJobId,
      categoryIds
    );

    const {
      categoryHistogramsById,
      timing: { spans: fetchTopLogEntryCategoryHistogramsSpans },
    } = await this.fetchTopLogEntryCategoryHistograms(
      requestContext,
      logEntryCategoriesCountJobId,
      categoryIds,
      histograms
    );

    const topLogEntryCategoriesSpan = finalizeTopLogEntryCategoriesSpan();

    return {
      data: topLogEntryCategories.map(topCategory => ({
        ...topCategory,
        regularExpression: logEntryCategoriesById[topCategory.categoryId]?._source.regex ?? '',
        histograms: categoryHistogramsById[topCategory.categoryId] ?? [],
      })),
      timing: {
        spans: [
          topLogEntryCategoriesSpan,
          ...fetchTopLogEntryCategoriesAggSpans,
          ...fetchTopLogEntryCategoryPatternsSpans,
          ...fetchTopLogEntryCategoryHistogramsSpans,
        ],
      },
    };
  }

  private async fetchTopLogEntryCategories(
    requestContext: RequestHandlerContext,
    logEntryCategoriesCountJobId: string,
    startTime: number,
    endTime: number,
    categoryCount: number
  ) {
    const finalizeEsSearchSpan = startTracingSpan('Fetch top categories from ES');

    const topLogEntryCategoriesResponse = decodeOrThrow(topLogEntryCategoriesResponseRT)(
      await this.libs.framework.callWithRequest(
        requestContext,
        'search',
        createTopLogEntryCategoriesQuery(
          logEntryCategoriesCountJobId,
          startTime,
          endTime,
          categoryCount
        )
      )
    );

    const esSearchSpan = finalizeEsSearchSpan();

    if (topLogEntryCategoriesResponse._shards.total === 0) {
      throw new NoLogAnalysisResultsIndexError(
        `Failed to find ml result index for job ${logEntryCategoriesCountJobId}.`
      );
    }

    const topLogEntryCategories = topLogEntryCategoriesResponse.aggregations.terms_category_id.buckets.map(
      topCategoryBucket => ({
        categoryId: parseCategoryId(topCategoryBucket.key),
        logEntryCount: topCategoryBucket.sum_actual.value,
        datasets: topCategoryBucket.terms_dataset.buckets.map(datasetBucket => datasetBucket.key),
      })
    );

    return {
      topLogEntryCategories,
      timing: {
        spans: [esSearchSpan],
      },
    };
  }

  private async fetchLogEntryCategories(
    requestContext: RequestHandlerContext,
    logEntryCategoriesCountJobId: string,
    categoryIds: number[]
  ) {
    if (categoryIds.length === 0) {
      return {
        logEntryCategoriesById: {},
        timing: { spans: [] },
      };
    }

    const finalizeEsSearchSpan = startTracingSpan('Fetch category patterns from ES');

    const logEntryCategoriesResponse = decodeOrThrow(logEntryCategoriesResponseRT)(
      await this.libs.framework.callWithRequest(
        requestContext,
        'search',
        createLogEntryCategoriesQuery(logEntryCategoriesCountJobId, categoryIds)
      )
    );

    const esSearchSpan = finalizeEsSearchSpan();

    const logEntryCategoriesById = logEntryCategoriesResponse.hits.hits.reduce<
      Record<number, LogEntryCategoryHit>
    >(
      (accumulatedCategoriesById, categoryHit) => ({
        ...accumulatedCategoriesById,
        [categoryHit._source.category_id]: categoryHit,
      }),
      {}
    );

    return {
      logEntryCategoriesById,
      timing: {
        spans: [esSearchSpan],
      },
    };
  }

  private async fetchTopLogEntryCategoryHistograms(
    requestContext: RequestHandlerContext,
    logEntryCategoriesCountJobId: string,
    categoryIds: number[],
    histograms: HistogramParameters[]
  ) {
    if (categoryIds.length === 0 || histograms.length === 0) {
      return {
        categoryHistogramsById: {},
        timing: { spans: [] },
      };
    }

    const finalizeEsSearchSpan = startTracingSpan('Fetch category histograms from ES');

    const categoryHistogramsReponses = await Promise.all(
      histograms.map(({ bucketCount, endTime, id: histogramId, startTime }) =>
        this.libs.framework
          .callWithRequest(
            requestContext,
            'search',
            createLogEntryCategoryHistogramsQuery(
              logEntryCategoriesCountJobId,
              categoryIds,
              startTime,
              endTime,
              bucketCount
            )
          )
          .then(decodeOrThrow(logEntryCategoryHistogramsResponseRT))
          .then(response => ({
            histogramId,
            histogramBuckets: response.aggregations.filters_categories.buckets,
          }))
      )
    );

    const esSearchSpan = finalizeEsSearchSpan();

    const categoryHistogramsById = Object.values(categoryHistogramsReponses).reduce<
      Record<
        number,
        Array<{
          histogramId: string;
          buckets: Array<{
            bucketDuration: number;
            logEntryCount: number;
            startTime: number;
          }>;
        }>
      >
    >(
      (outerAccumulatedHistograms, { histogramId, histogramBuckets }) =>
        Object.entries(histogramBuckets).reduce(
          (innerAccumulatedHistograms, [categoryBucketKey, categoryBucket]) => {
            const categoryId = parseCategoryId(categoryBucketKey);
            return {
              ...innerAccumulatedHistograms,
              [categoryId]: [
                ...(innerAccumulatedHistograms[categoryId] ?? []),
                {
                  histogramId,
                  buckets: categoryBucket.histogram_timestamp.buckets.map(bucket => ({
                    bucketDuration: categoryBucket.histogram_timestamp.meta.bucketDuration,
                    logEntryCount: bucket.sum_actual.value,
                    startTime: bucket.key,
                  })),
                },
              ],
            };
          },
          outerAccumulatedHistograms
        ),
      {}
    );

    return {
      categoryHistogramsById,
      timing: {
        spans: [esSearchSpan],
      },
    };
  }
}

const parseCategoryId = (rawCategoryId: string) => parseInt(rawCategoryId, 10);

interface HistogramParameters {
  id: string;
  startTime: number;
  endTime: number;
  bucketCount: number;
}
