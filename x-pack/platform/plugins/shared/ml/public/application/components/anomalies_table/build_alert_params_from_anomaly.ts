/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlAnomaliesTableRecord } from '@kbn/ml-anomaly-utils';
import { ML_ANOMALY_RESULT_TYPE, getEntityFieldList } from '@kbn/ml-anomaly-utils';
import { isDefined } from '@kbn/ml-is-defined';
import type { MlAnomalyDetectionAlertParams } from '../../../../common/types/alerts';
import { escapeKueryForFieldValuePair } from '../../util/string_utils';

const SEVERITY_THRESHOLD_ADJUSTMENT = 5;

/**
 * Builds initial alert parameters from an anomaly record.
 * Pre-populates job ID, severity, result type, and KQL filter based on the anomaly's characteristics.
 */
export function buildAlertParamsFromAnomaly(
  anomaly: MlAnomaliesTableRecord
): Partial<MlAnomalyDetectionAlertParams> {
  const kqlParts: string[] = [];

  // Add entity field filters (partition, over, by fields)
  const entityFields = getEntityFieldList(anomaly.source);
  entityFields.forEach((field) => {
    if (field.fieldName && isDefined(field.fieldValue)) {
      kqlParts.push(escapeKueryForFieldValuePair(field.fieldName, String(field.fieldValue)));
    }
  });

  const actualValue = Array.isArray(anomaly.actual) ? anomaly.actual[0] : anomaly.actual;

  // Add actual value filter if we have a value
  if (typeof actualValue === 'number') {
    // Determine if this is a population job by checking if the anomaly has causes
    // Population jobs have anomalies with a causes array
    const hasCauses = Array.isArray(anomaly.source.causes) && anomaly.source.causes.length > 0;

    // For population jobs (with causes), use nested query syntax: causes: {actual >= value}
    // For regular jobs, use simple comparison: actual >= value
    if (hasCauses) {
      kqlParts.push(`causes: {actual >= ${actualValue}}`);
    } else {
      kqlParts.push(`actual >= ${actualValue}`);
    }
  }

  // Combine all KQL parts
  const kqlQueryString = kqlParts.length > 0 ? kqlParts.join(' and ') : null;

  // Set severity slightly lower than the anomaly to catch similar anomalies
  const severity = Math.max(0, Math.floor(anomaly.severity) - SEVERITY_THRESHOLD_ADJUSTMENT);

  return {
    jobSelection: {
      jobIds: [anomaly.jobId],
    },
    severity,
    resultType: ML_ANOMALY_RESULT_TYPE.RECORD,
    includeInterim: false,
    kqlQueryString,
  };
}
