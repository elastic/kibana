/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getKqlFieldNamesFromExpression } from '@kbn/es-query';
import { ANOMALY_RESULT_TYPE_SCORE_FIELDS } from '../../constants/alerts';

export interface AnomalyAlertFieldUsage {
  hasAnomalyScoreFilter: boolean;
  hasInterimFilter: boolean;
}

/**
 * Parse KQL query to detect which fields are being used.
 * This helps us:
 * - Disable conflicting UI controls (client-side)
 * - Skip redundant filters when executing alerts (server-side)
 */
export function detectAnomalyAlertFieldUsage(
  kqlQuery: string | null | undefined
): AnomalyAlertFieldUsage {
  const result: AnomalyAlertFieldUsage = {
    hasAnomalyScoreFilter: false,
    hasInterimFilter: false,
  };

  if (!kqlQuery || !kqlQuery.trim()) {
    return result;
  }

  try {
    const fieldNames = getKqlFieldNamesFromExpression(kqlQuery);

    const scoreFields = Object.values(ANOMALY_RESULT_TYPE_SCORE_FIELDS) as string[];

    result.hasAnomalyScoreFilter = fieldNames.some((field) => scoreFields.includes(field));

    result.hasInterimFilter = fieldNames.includes('is_interim');
  } catch (error) {
    return result;
  }

  return result;
}
