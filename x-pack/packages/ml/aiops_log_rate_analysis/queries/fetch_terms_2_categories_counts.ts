/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { FieldValuePair, ItemSet, SignificantItem } from '@kbn/ml-agg-utils';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { getCategoryQuery } from '@kbn/aiops-log-pattern-analysis/get_category_query';
import type { Category } from '@kbn/aiops-log-pattern-analysis/types';
import { isRequestAbortedError } from '@kbn/aiops-common/is_request_aborted_error';

import type { AiopsLogRateAnalysisSchema } from '../api/schema';
import type { FetchFrequentItemSetsResponse } from '../types';
import { LOG_RATE_ANALYSIS_SETTINGS } from '../constants';

import { getQueryWithParams } from './get_query_with_params';

const isMsearchResponseItem = (arg: unknown): arg is estypes.MsearchMultiSearchItem =>
  isPopulatedObject(arg, ['hits']);

const getTerm2CategoryCountRequest = (
  params: AiopsLogRateAnalysisSchema,
  fieldValuePairs: FieldValuePair[],
  categoryFieldName: string,
  category: Category,
  from: number | undefined,
  to: number | undefined
): estypes.SearchRequest['body'] => {
  const query = getQueryWithParams({
    params,
  });

  const categoryQuery = getCategoryQuery(categoryFieldName, [category]);

  if (Array.isArray(query.bool?.filter)) {
    for (const { fieldName, fieldValue } of fieldValuePairs) {
      query.bool?.filter?.push({ term: { [fieldName]: fieldValue } });
    }
    query.bool?.filter?.push(categoryQuery);
    query.bool?.filter?.push({
      range: {
        [params.timeFieldName]: {
          gte: from,
          lte: to,
          format: 'epoch_millis',
        },
      },
    });
  }

  return {
    query,
    size: 0,
    track_total_hits: true,
  };
};

export async function fetchTerms2CategoriesCounts(
  esClient: ElasticsearchClient,
  params: AiopsLogRateAnalysisSchema,
  searchQuery: estypes.QueryDslQueryContainer,
  significantTerms: SignificantItem[],
  itemSets: ItemSet[],
  significantCategories: SignificantItem[],
  from: number,
  to: number,
  logger: Logger,
  emitError: (m: string) => void,
  abortSignal?: AbortSignal
): Promise<FetchFrequentItemSetsResponse> {
  const searches: Array<
    | estypes.MsearchMultisearchBody
    | {
        index: string;
      }
  > = [];
  const results: ItemSet[] = [];

  significantCategories.forEach((category) => {
    significantTerms.forEach((term) => {
      searches.push({ index: params.index });
      searches.push(
        getTerm2CategoryCountRequest(
          params,
          [{ fieldName: term.fieldName, fieldValue: term.fieldValue }],
          category.fieldName,
          { key: `${category.key}`, count: category.doc_count, examples: [], regex: '' },
          from,
          to
        ) as estypes.MsearchMultisearchBody
      );
      results.push({
        set: [
          { fieldName: term.fieldName, fieldValue: term.fieldValue },
          { fieldName: category.fieldName, fieldValue: category.fieldValue },
        ],
        size: 2,
        maxPValue: Math.max(term.pValue ?? 1, category.pValue ?? 1),
        doc_count: 0,
        support: 0,
        total_doc_count: Math.max(term.total_doc_count, category.total_doc_count),
      });
    });

    itemSets.forEach((itemSet) => {
      searches.push({ index: params.index });
      searches.push(
        getTerm2CategoryCountRequest(
          params,
          itemSet.set,
          category.fieldName,
          { key: `${category.key}`, count: category.doc_count, examples: [], regex: '' },
          from,
          to
        ) as estypes.MsearchMultisearchBody
      );
      results.push({
        set: [...itemSet.set, { fieldName: category.fieldName, fieldValue: category.fieldValue }],
        size: Object.keys(itemSet.set).length + 1,
        maxPValue: Math.max(itemSet.maxPValue ?? 1, category.pValue ?? 1),
        doc_count: 0,
        support: 0,
        total_doc_count: Math.max(itemSet.total_doc_count, category.total_doc_count),
      });
    });
  });

  let mSearchresponse;

  try {
    mSearchresponse = await esClient.msearch(
      { searches },
      {
        signal: abortSignal,
        maxRetries: 0,
      }
    );
  } catch (error) {
    if (!isRequestAbortedError(error)) {
      logger.error(
        `Failed to fetch term/category counts, got: \n${JSON.stringify(error, null, 2)}`
      );
      emitError(`Failed to fetch term/category counts.`);
    }
    return {
      fields: [],
      itemSets: [],
      totalDocCount: 0,
    };
  }

  const mSearchResponses = mSearchresponse.responses;

  return {
    fields: uniq(significantCategories.map((c) => c.fieldName)),
    itemSets: results
      .map((result, i) => {
        const resp = mSearchResponses[i];
        if (isMsearchResponseItem(resp)) {
          result.doc_count = (resp.hits.total as estypes.SearchTotalHits).value ?? 0;
          if (result.total_doc_count > 0) {
            // Replicates how the `frequent_item_sets` aggregation calculates
            // the support value by dividing the number of documents containing
            // the item set by the total number of documents.
            result.support = result.doc_count / result.total_doc_count;
          }
        }
        return result;
      })
      .filter(
        (d) =>
          d.doc_count > 0 &&
          d.support > LOG_RATE_ANALYSIS_SETTINGS.FREQUENT_ITEMS_SETS_MINIMUM_SUPPORT
      ),
    totalDocCount: 0,
  };
}
