/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ES_FIELD_TYPES } from '../../../../../../../../../../../src/plugins/data/public';
import { Field, EVENT_RATE_FIELD_ID } from '../../../../../../../common/types/fields';
import { JOB_TYPES, AnalyticsJobType } from '../../hooks/use_create_analytics_form/state';
import { BASIC_NUMERICAL_TYPES, EXTENDED_NUMERICAL_TYPES } from '../../../../common/fields';

const CATEGORICAL_TYPES = new Set(['ip', 'keyword', 'text']);

// List of system fields we want to ignore for the numeric field check.
export const OMIT_FIELDS: string[] = ['_source', '_type', '_index', '_id', '_version', '_score'];

// Regression supports numeric fields. Classification supports categorical, numeric, and boolean.
export const shouldAddAsDepVarOption = (field: Field, jobType: AnalyticsJobType) => {
  if (field.id === EVENT_RATE_FIELD_ID) return false;

  const isBasicNumerical = BASIC_NUMERICAL_TYPES.has(field.type);

  const isSupportedByClassification =
    isBasicNumerical || CATEGORICAL_TYPES.has(field.type) || field.type === ES_FIELD_TYPES.BOOLEAN;

  if (jobType === JOB_TYPES.REGRESSION) {
    return isBasicNumerical || EXTENDED_NUMERICAL_TYPES.has(field.type);
  }
  if (jobType === JOB_TYPES.CLASSIFICATION) return isSupportedByClassification;
};
