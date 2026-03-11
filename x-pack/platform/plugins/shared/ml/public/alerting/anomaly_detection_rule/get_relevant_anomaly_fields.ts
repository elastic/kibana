/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlAnomalyResultType } from '@kbn/ml-anomaly-utils';
import { ML_ANOMALY_RESULT_TYPE } from '@kbn/ml-anomaly-utils';
import {
  BASE_RECORD_FILTER_FIELDS,
  RECORD_INFLUENCER_FIELDS,
  INFLUENCER_FILTER_FIELDS,
  TOP_LEVEL_ACTUAL_TYPICAL_FIELDS,
  NESTED_ACTUAL_TYPICAL_FIELDS,
  DETECTOR_FILTER_FIELDS,
} from '@kbn/ml-anomaly-utils/alerting/filter_field_constants';
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
    return [...INFLUENCER_FILTER_FIELDS];
  }

  // Determine if this is a pure population job (single detector with over_field)
  const isPurePopulationJob =
    jobConfigs.length > 0 &&
    jobConfigs.every((job) => {
      const detectors = job.analysis_config?.detectors ?? [];
      return detectors.length === 1 && detectors[0].over_field_name;
    });

  // Check if any job has influencers configured
  const hasInfluencers =
    jobConfigs.length > 0 &&
    jobConfigs.some((job) => {
      const influencers = job.analysis_config?.influencers ?? [];
      return influencers.length > 0;
    });

  // Add actual/typical fields based on job type
  const recordFields: string[] = [
    ...BASE_RECORD_FILTER_FIELDS,
    ...(hasInfluencers ? RECORD_INFLUENCER_FIELDS : []),
    ...(isPurePopulationJob ? NESTED_ACTUAL_TYPICAL_FIELDS : TOP_LEVEL_ACTUAL_TYPICAL_FIELDS),
  ];

  const detectorFields = new Set<string>();

  if (jobConfigs.length > 0) {
    jobConfigs.forEach((job) => {
      const detectors = job.analysis_config?.detectors ?? [];

      detectors.forEach((detector) => {
        if (detector.partition_field_name) {
          detectorFields.add(DETECTOR_FILTER_FIELDS.PARTITION_FIELD_NAME);
          detectorFields.add(DETECTOR_FILTER_FIELDS.PARTITION_FIELD_VALUE);
          detectorFields.add(detector.partition_field_name);
        }

        if (detector.by_field_name) {
          detectorFields.add(DETECTOR_FILTER_FIELDS.BY_FIELD_NAME);
          detectorFields.add(DETECTOR_FILTER_FIELDS.BY_FIELD_VALUE);
          detectorFields.add(detector.by_field_name);
        }

        if (detector.over_field_name) {
          detectorFields.add(DETECTOR_FILTER_FIELDS.OVER_FIELD_NAME);
          detectorFields.add(DETECTOR_FILTER_FIELDS.OVER_FIELD_VALUE);
          detectorFields.add(detector.over_field_name);
        }
      });
    });
  }

  return [...recordFields, ...Array.from(detectorFields)];
}
