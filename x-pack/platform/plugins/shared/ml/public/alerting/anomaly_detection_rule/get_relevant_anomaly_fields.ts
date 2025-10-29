/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlAnomalyResultType } from '@kbn/ml-anomaly-utils';
import { ML_ANOMALY_RESULT_TYPE } from '@kbn/ml-anomaly-utils';
import type { CombinedJobWithStats } from '../../../common/types/anomaly_detection_jobs';

/**
 * Get relevant fields for filtering anomalies based on job configuration and result type.
 * These fields will be used to restrict autocomplete suggestions in the KQL filter.
 */
export function getRelevantAnomalyFields(
  jobConfigs: CombinedJobWithStats[],
  resultType: MlAnomalyResultType
): string[] {
  // For bucket result type, filtering is disabled
  if (resultType === ML_ANOMALY_RESULT_TYPE.BUCKET) {
    return [];
  }

  if (resultType === ML_ANOMALY_RESULT_TYPE.INFLUENCER) {
    return ['influencer_field_name', 'influencer_field_value', 'influencer_score'];
  }

  // For RECORD result type
  const baseRecordFields = [
    'record_score',
    'initial_record_score',
    'function',
    'field_name',
    'influencers.influencer_field_name',
    'influencers.influencer_field_values',
  ];

  // Determine if this is a pure population job (single detector with over_field)
  const isPurePopulationJob =
    jobConfigs.length > 0 &&
    jobConfigs.every((job) => {
      const detectors = job.analysis_config?.detectors || [];
      return detectors.length === 1 && detectors[0].over_field_name;
    });

  // Add actual/typical fields based on job type
  const recordFields = [...baseRecordFields];
  if (isPurePopulationJob) {
    // Pure population job, use nested paths
    recordFields.push('causes.actual', 'causes.typical');
  } else {
    // Non-population or mixed, use top-level fields
    recordFields.push('actual', 'typical');
  }

  const detectorFields = new Set<string>();

  if (jobConfigs.length > 0) {
    jobConfigs.forEach((job) => {
      const detectors = job.analysis_config?.detectors || [];

      detectors.forEach((detector) => {
        if (detector.partition_field_name) {
          detectorFields.add('partition_field_name');
          detectorFields.add('partition_field_value');
          detectorFields.add(detector.partition_field_name);
        }

        if (detector.by_field_name) {
          detectorFields.add('by_field_name');
          detectorFields.add('by_field_value');
          detectorFields.add(detector.by_field_name);
        }

        if (detector.over_field_name) {
          detectorFields.add('over_field_name');
          detectorFields.add('over_field_value');
          detectorFields.add(detector.over_field_name);
        }
      });
    });
  }

  return [...recordFields, ...Array.from(detectorFields)];
}
