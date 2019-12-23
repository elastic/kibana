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
    categoryCount: number
    // bucketDuration: number
  ) {
    const topLogEntryCategoriesSpan = startTracingSpan('get top categories');

    const logEntryCategoriesCountJobId = getJobId(
      this.libs.framework.getSpaceId(request),
      sourceId,
      logEntryCategoriesJobTypes[0]
    );

    const fetchTopLogEntryCategoriesAggSpan = topLogEntryCategoriesSpan.startChild(
      'fetch top categories from ES'
    );

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

    fetchTopLogEntryCategoriesAggSpan.stop();

    if (topLogEntryCategoriesResponse._shards.total === 0) {
      throw new NoLogAnalysisResultsIndexError(
        `Failed to find ml result index for job ${logEntryCategoriesCountJobId}.`
      );
    }

    const topCategories = topLogEntryCategoriesResponse.aggregations.terms_category_id.buckets.map(
      topCategoryBucket => ({
        categoryId: parseCategoryId(topCategoryBucket.key),
        logEntryCount: topCategoryBucket.sum_actual.value,
        datasets: topCategoryBucket.terms_dataset.buckets.map(datasetBucket => datasetBucket.key),
      })
    );

    const categoryIds = topCategories.map(({ categoryId }) => categoryId);

    const fetchTopLogEntryCategoryPatternsSpan = topLogEntryCategoriesSpan.startChild(
      'fetch category patterns from ES'
    );

    const logEntryCategoriesResponse = decodeOrThrow(logEntryCategoriesResponseRT)(
      await this.libs.framework.callWithRequest(
        requestContext,
        'search',
        createLogEntryCategoriesQuery(logEntryCategoriesCountJobId, categoryIds)
      )
    );

    fetchTopLogEntryCategoryPatternsSpan.stop();

    const logEntryCategoriesById = logEntryCategoriesResponse.hits.hits.reduce<
      Record<number, LogEntryCategoryHit>
    >(
      (accumulatedCategoriesById, categoryHit) => ({
        ...accumulatedCategoriesById,
        [categoryHit._source.category_id]: categoryHit,
      }),
      {}
    );

    topLogEntryCategoriesSpan.stop();

    return {
      data: topCategories.map(topCategory => ({
        ...topCategory,
        regularExpression: logEntryCategoriesById[topCategory.categoryId]._source.regex,
      })),
      timing: {
        spans: [
          topLogEntryCategoriesSpan.state,
          fetchTopLogEntryCategoriesAggSpan.state,
          fetchTopLogEntryCategoryPatternsSpan.state,
        ],
      },
    };
  }
}

const parseCategoryId = (rawCategoryId: string) => parseInt(rawCategoryId, 10);
