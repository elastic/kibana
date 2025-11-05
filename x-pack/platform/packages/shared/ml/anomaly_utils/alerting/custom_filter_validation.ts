/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { getKqlFieldNamesFromExpression } from '@kbn/es-query/src/kuery/utils/get_kql_fields';
import { ML_ANOMALY_RESULT_TYPE } from '../constants';
import type { MlAnomalyResultType } from '../types';
import {
  BASE_RECORD_FILTER_FIELDS,
  INFLUENCER_FILTER_FIELDS,
  DETECTOR_FILTER_FIELD_NAMES,
  TOP_LEVEL_ACTUAL_TYPICAL_FIELDS,
  NESTED_ACTUAL_TYPICAL_FIELDS,
} from './filter_field_constants';

/**
 * Static list of allowed fields for anomaly detection filters by result type.
 *
 * For RECORD type, we include both top-level and nested actual/typical fields since
 * we don't have job configuration at validation time to determine which is appropriate.
 */
export const ANOMALY_DETECTION_ALLOWED_FIELDS = {
  [ML_ANOMALY_RESULT_TYPE.BUCKET]: [] as string[],
  [ML_ANOMALY_RESULT_TYPE.INFLUENCER]: [...INFLUENCER_FILTER_FIELDS],
  [ML_ANOMALY_RESULT_TYPE.RECORD]: [
    ...BASE_RECORD_FILTER_FIELDS,
    ...TOP_LEVEL_ACTUAL_TYPICAL_FIELDS,
    ...NESTED_ACTUAL_TYPICAL_FIELDS,
    ...DETECTOR_FILTER_FIELD_NAMES,
  ],
} as const;

/**
 * Get allowed fields for filtering anomalies based on result type.
 */
export function getAllowedAnomalyFields(resultType: MlAnomalyResultType): string[] {
  return [...(ANOMALY_DETECTION_ALLOWED_FIELDS[resultType] || [])];
}

/**
 * Validates that fields in a KQL filter are in the allowlist for the given result type.
 */
export function validateCustomFilterFields(
  kqlQueryString: string,
  resultType: MlAnomalyResultType
): string | undefined {
  // Check if filtering is allowed for this result type
  if (resultType === ML_ANOMALY_RESULT_TYPE.BUCKET) {
    return i18n.translate('xpack.ml.anomalyDetection.customFilter.bucketNotSupported', {
      defaultMessage: 'Custom filters are not supported for bucket result type',
    });
  }

  // Extract field names from the KQL
  let fieldNames: string[];
  try {
    fieldNames = getKqlFieldNamesFromExpression(kqlQueryString);
  } catch (e) {
    // Syntax error, caller should handle KQL syntax validation separately
    return undefined;
  }

  // Validate against allowlist
  const allowedFields = getAllowedAnomalyFields(resultType);
  const invalidFields = fieldNames.filter((field) => !allowedFields.includes(field));

  if (invalidFields.length > 0) {
    return i18n.translate('xpack.ml.anomalyDetection.customFilter.invalidFields', {
      defaultMessage: 'The following fields are not valid for {resultType} result type: {fields}',
      values: {
        resultType,
        fields: invalidFields.join(', '),
      },
    });
  }

  return undefined;
}
