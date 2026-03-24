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
import { DISALLOWED_FILTER_FIELDS } from './filter_field_constants';

/**
 * Validates that fields in a KQL filter are not in the disallowlist for the given result type.
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

  // Validate against disallowlist
  const disallowedFields: string[] = [...DISALLOWED_FILTER_FIELDS];
  const invalidFields = fieldNames.filter((field) => disallowedFields.includes(field));

  if (invalidFields.length > 0) {
    return i18n.translate('xpack.ml.anomalyDetection.customFilter.disallowedFields', {
      defaultMessage: 'The following fields are not allowed for filtering: {fields}',
      values: {
        fields: invalidFields.join(', '),
      },
    });
  }

  return undefined;
}
