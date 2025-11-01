/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlAnomaliesTableRecord } from '@kbn/ml-anomaly-utils';
import { ML_ANOMALY_RESULT_TYPE } from '@kbn/ml-anomaly-utils';
import { isDefined } from '@kbn/ml-is-defined';
import type { MlAnomalyDetectionAlertParams } from '../../../../common/types/alerts';
import { escapeKueryForFieldValuePair } from '../../util/string_utils';

const SEVERITY_THRESHOLD_ADJUSTMENT = 5;

function addFieldFilter(
  kqlParts: string[],
  fieldName: string | undefined,
  fieldValue: unknown
): void {
  if (fieldName && isDefined(fieldValue)) {
    kqlParts.push(escapeKueryForFieldValuePair(fieldName, String(fieldValue)));
  }
}

/**
 * Builds initial alert parameters from an anomaly record.
 * Pre-populates job ID, severity, result type, and KQL filter based on the anomaly's characteristics.
 */
export function buildAlertParamsFromAnomaly(
  anomaly: MlAnomaliesTableRecord
): Partial<MlAnomalyDetectionAlertParams> {
  const kqlParts: string[] = [];

  // Add partition field filter
  addFieldFilter(
    kqlParts,
    anomaly.source.partition_field_name,
    anomaly.source.partition_field_value
  );

  // Add over field filter
  addFieldFilter(kqlParts, anomaly.source.over_field_name, anomaly.source.over_field_value);

  // Add by field filter
  addFieldFilter(kqlParts, anomaly.source.by_field_name, anomaly.source.by_field_value);

  // Add influencer filters
  if (Array.isArray(anomaly.influencers) && anomaly.influencers.length > 0) {
    anomaly.influencers.forEach((influencer) => {
      addFieldFilter(
        kqlParts,
        influencer?.influencer_field_name,
        influencer?.influencer_field_value
      );
    });
  }

  // Add actual value filter
  const actualValue = isDefined(anomaly.actual)
    ? Array.isArray(anomaly.actual)
      ? anomaly.actual[0]
      : anomaly.actual
    : undefined;

  // Add actual value filter if we have a value
  if (isDefined(actualValue) && typeof actualValue === 'number') {
    // Determine if this is a population job by checking if the anomaly has causes
    // Population jobs have anomalies with a causes array
    const hasCauses = Array.isArray(anomaly.source.causes) && anomaly.source.causes.length > 0;

    // For population jobs (with causes), use nested query syntax: causes: {actual > value}
    // For regular jobs, use simple comparison: actual > value
    if (hasCauses) {
      kqlParts.push(`causes: {actual > ${actualValue}}`);
    } else {
      kqlParts.push(`actual > ${actualValue}`);
    }
  }

  // Combine all KQL parts
  const customFilter = kqlParts.length > 0 ? kqlParts.join(' and ') : null;

  // Set severity slightly lower than the anomaly to catch similar anomalies
  const severity = Math.max(0, Math.floor(anomaly.severity) - SEVERITY_THRESHOLD_ADJUSTMENT);

  return {
    jobSelection: {
      jobIds: [anomaly.jobId],
    },
    severity,
    resultType: ML_ANOMALY_RESULT_TYPE.RECORD,
    includeInterim: false,
    customFilter,
  };
}
