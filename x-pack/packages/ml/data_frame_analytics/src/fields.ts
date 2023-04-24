/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ES_FIELD_TYPES } from '@kbn/field-types';

import {
  getPredictedFieldName,
  getDependentVar,
  isClassificationAnalysis,
  isOutlierAnalysis,
  isRegressionAnalysis,
} from './analytics_utils';
import { OUTLIER_SCORE } from './constants';
import { DataFrameAnalyticsConfig } from './types';

export type EsId = string;
export type EsDocSource = Record<string, any>;
export type EsFieldName = string;

export interface EsDoc extends Record<string, any> {
  _id: EsId;
  _source: EsDocSource;
}

export const MAX_COLUMNS = 10;
export const DEFAULT_REGRESSION_COLUMNS = 8;

export const BASIC_NUMERICAL_TYPES = new Set([
  ES_FIELD_TYPES.UNSIGNED_LONG,
  ES_FIELD_TYPES.LONG,
  ES_FIELD_TYPES.INTEGER,
  ES_FIELD_TYPES.SHORT,
  ES_FIELD_TYPES.BYTE,
]);

export const EXTENDED_NUMERICAL_TYPES = new Set([
  ES_FIELD_TYPES.DOUBLE,
  ES_FIELD_TYPES.FLOAT,
  ES_FIELD_TYPES.HALF_FLOAT,
  ES_FIELD_TYPES.SCALED_FLOAT,
]);

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ML__ID_COPY = 'ml__id_copy';
// eslint-disable-next-line @typescript-eslint/naming-convention
export const ML__INCREMENTAL_ID = 'ml__incremental_id';

// Used to sort columns:
// - Anchor on the left ml.outlier_score, ml.is_training, <predictedField>, <actual>
// - string based columns are moved to the left
// - feature_influence/feature_importance fields get moved next to the corresponding field column
// - overall fields get sorted alphabetically
export const sortExplorationResultsFields = (
  a: string,
  b: string,
  jobConfig: DataFrameAnalyticsConfig
) => {
  const resultsField = jobConfig.dest.results_field;

  if (isOutlierAnalysis(jobConfig.analysis)) {
    if (a === `${resultsField}.${OUTLIER_SCORE}`) {
      return -1;
    }

    if (b === `${resultsField}.${OUTLIER_SCORE}`) {
      return 1;
    }
  }

  if (isClassificationAnalysis(jobConfig.analysis) || isRegressionAnalysis(jobConfig.analysis)) {
    const dependentVariable = getDependentVar(jobConfig.analysis);
    const predictedField = getPredictedFieldName(resultsField!, jobConfig.analysis, true);

    if (a === `${resultsField}.is_training`) {
      return -1;
    }
    if (b === `${resultsField}.is_training`) {
      return 1;
    }
    if (a === predictedField) {
      return -1;
    }
    if (b === predictedField) {
      return 1;
    }
    if (a === dependentVariable || a === dependentVariable.replace(/\.keyword$/, '')) {
      return -1;
    }
    if (b === dependentVariable || b === dependentVariable.replace(/\.keyword$/, '')) {
      return 1;
    }

    if (a === `${resultsField}.prediction_probability`) {
      return -1;
    }
    if (b === `${resultsField}.prediction_probability`) {
      return 1;
    }
  }

  const typeofA = typeof a;
  const typeofB = typeof b;

  const tokensA = a.split('.');
  const prefixA = tokensA[0];
  const tokensB = b.split('.');
  const prefixB = tokensB[0];

  if (prefixA === resultsField && tokensA.length > 1 && prefixB !== resultsField) {
    tokensA.shift();
    tokensA.shift();
    if (tokensA.join('.') === b) return 1;
    return tokensA.join('.').localeCompare(b);
  }

  if (prefixB === resultsField && tokensB.length > 1 && prefixA !== resultsField) {
    tokensB.shift();
    tokensB.shift();
    if (tokensB.join('.') === a) return -1;
    return a.localeCompare(tokensB.join('.'));
  }

  if (typeofA !== 'string' && typeofB === 'string') {
    return 1;
  }
  if (typeofA === 'string' && typeofB !== 'string') {
    return -1;
  }
  if (typeofA === 'string' && typeofB === 'string') {
    return a.localeCompare(b);
  }

  return a.localeCompare(b);
};
