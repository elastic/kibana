/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { criticalTableLookup, type Histogram } from '@kbn/ml-chi2test';
import { type SignificantItem, SIGNIFICANT_ITEM_TYPE } from '@kbn/ml-agg-utils';
import type { Category } from '@kbn/aiops-log-pattern-analysis/types';

import type { AiopsLogRateAnalysisSchema } from '../api/schema';
import { LOG_RATE_ANALYSIS_SETTINGS } from '../constants';

import { fetchCategories } from './fetch_categories';
import { fetchCategoryCounts } from './fetch_category_counts';
import { getNormalizedScore } from './get_normalized_score';

const getCategoriesTestData = (categories: Category[]): Histogram[] => {
  const categoriesBaselineTotalCount = getCategoriesTotalCount(categories);
  return categories.map((d) => ({
    key: d.key,
    doc_count: d.count,
    percentage: d.count / categoriesBaselineTotalCount,
  }));
};

const getCategoriesTotalCount = (categories: Category[]): number =>
  categories.reduce((p, c) => p + c.count, 0);

export const fetchSignificantCategories = async (
  esClient: ElasticsearchClient,
  params: AiopsLogRateAnalysisSchema,
  fieldNames: string[],
  logger: Logger,
  // The default value of 1 means no sampling will be used
  sampleProbability: number = 1,
  emitError: (m: string) => void,
  abortSignal?: AbortSignal
) => {
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

  const significantCategories: SignificantItem[] = [];

  // Using for...of to allow `await` within the loop.
  for (const [i, fieldName] of fieldNames.entries()) {
    if (categoriesOverall[i].categories.length === 0) {
      continue;
    }

    const categoriesBaseline = await fetchCategoryCounts(
      esClient,
      params,
      fieldName,
      categoriesOverall[i],
      params.baselineMin,
      params.baselineMax,
      logger,
      emitError,
      abortSignal
    );

    const categoriesDeviation = await fetchCategoryCounts(
      esClient,
      params,
      fieldName,
      categoriesOverall[i],
      params.deviationMin,
      params.deviationMax,
      logger,
      emitError,
      abortSignal
    );

    const categoriesBaselineTotalCount = getCategoriesTotalCount(categoriesBaseline.categories);
    const categoriesBaselineTestData = getCategoriesTestData(categoriesBaseline.categories);

    const categoriesDeviationTotalCount = getCategoriesTotalCount(categoriesDeviation.categories);
    const categoriesDeviationTestData = getCategoriesTestData(categoriesDeviation.categories);

    // Get all unique keys from both arrays
    const allKeys: string[] = uniq([
      ...categoriesBaselineTestData.map((term) => term.key.toString()),
      ...categoriesDeviationTestData.map((term) => term.key.toString()),
    ]);

    allKeys.forEach((key) => {
      const categoryData = categoriesOverall[i].categories.find((c) => c.key === key);

      const baselineTerm = categoriesBaselineTestData.find((term) => term.key === key);
      const deviationTerm = categoriesDeviationTestData.find((term) => term.key === key);

      const observed: number = deviationTerm?.percentage ?? 0;
      const expected: number = baselineTerm?.percentage ?? 0;
      const chiSquared = Math.pow(observed - expected, 2) / (expected > 0 ? expected : 1e-6); // Prevent divide by zero

      const pValue = criticalTableLookup(chiSquared, 1);
      const score = Math.log(pValue);

      if (pValue <= LOG_RATE_ANALYSIS_SETTINGS.P_VALUE_THRESHOLD && observed > expected) {
        significantCategories.push({
          key,
          fieldName,
          fieldValue: categoryData?.examples[0] ?? '',
          doc_count: deviationTerm?.doc_count ?? 0,
          bg_count: baselineTerm?.doc_count ?? 0,
          total_doc_count: categoriesDeviationTotalCount,
          total_bg_count: categoriesBaselineTotalCount,
          score,
          pValue,
          normalizedScore: getNormalizedScore(score),
          type: SIGNIFICANT_ITEM_TYPE.LOG_PATTERN,
        });
      }
    });
  }

  return significantCategories;
};
