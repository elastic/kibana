/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';

import { type SignificantItem, SIGNIFICANT_ITEM_TYPE } from '@kbn/ml-agg-utils';

import { fetchCategories } from './fetch_categories';
import type { FetchTopOptions } from './fetch_top_types';

export const fetchTopCategories = async ({
  esClient,
  abortSignal,
  emitError,
  logger,
  arguments: args,
}: FetchTopOptions) => {
  // The default value of 1 means no sampling will be used
  const { fieldNames, sampleProbability = 1, ...params } = args;

  const categoriesOverall = await fetchCategories(
    esClient,
    params,
    fieldNames,
    logger,
    sampleProbability,
    emitError,
    abortSignal
  );

  if (categoriesOverall.length !== fieldNames.length) return [];

  const topCategories: SignificantItem[] = [];

  // Using for...of to allow `await` within the loop.
  for (const [i, fieldName] of fieldNames.entries()) {
    if (categoriesOverall[i].categories.length === 0) {
      continue;
    }

    // Get all unique keys
    const allKeys: string[] = uniq(categoriesOverall[i].categories.map((cd) => cd.key));

    allKeys.forEach((key) => {
      const categoryData = categoriesOverall[i].categories.find((c) => c.key === key);

      topCategories.push({
        key,
        fieldName,
        fieldValue: categoryData?.examples[0] ?? '',
        doc_count: categoryData?.count ?? 0,
        bg_count: 0,
        total_doc_count: 0,
        total_bg_count: 0,
        score: 0,
        pValue: 1,
        normalizedScore: 0,
        type: SIGNIFICANT_ITEM_TYPE.LOG_PATTERN,
      });
    });
  }

  return topCategories;
};
