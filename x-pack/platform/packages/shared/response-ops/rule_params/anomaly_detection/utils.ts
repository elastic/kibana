/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlAnomalyResultType } from '@kbn/ml-anomaly-utils';
import { validateCustomFilterFields } from '@kbn/ml-anomaly-utils';

import { validateKQLStringFilter } from '../common/utils';

/**
 * Validates the kqlQueryString for anomaly detection rules.
 * Validates both KQL syntax and checks against disallowed fields.
 */
export function validateAnomalyDetectionCustomFilter(
  kqlQueryString: string | null,
  resultType: MlAnomalyResultType
): string | undefined {
  if (!kqlQueryString) {
    return undefined;
  }

  const syntaxError = validateKQLStringFilter(kqlQueryString);
  if (syntaxError) {
    return syntaxError;
  }

  return validateCustomFilterFields(kqlQueryString, resultType);
}
