/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { MlEntityField } from '@kbn/ml-anomaly-utils';

// Returns a flag to indicate whether model plot has been enabled for a job.
// If model plot is enabled for a job with a terms filter (comma separated
// list of partition or by field names), performs additional checks that
// the supplied entities contains 'by' and 'partition' fields in the detector,
// if configured, whose values are in the configured model_plot_config terms,
// where entityFields is in the format [{fieldName:status, fieldValue:404}].
export function isModelPlotEnabled(
  job: Job,
  detectorIndex: number,
  entityFields?: MlEntityField[]
): boolean {
  // Check if model_plot_config is enabled.
  let isEnabled = job.model_plot_config?.enabled ?? false;

  if (isEnabled && entityFields !== undefined && entityFields.length > 0) {
    // If terms filter is configured in model_plot_config, check supplied entities.
    const termsStr = job.model_plot_config?.terms ?? '';
    if (termsStr !== '') {
      // NB. Do not currently support empty string values as being valid 'by' or
      // 'partition' field values even though this is supported on the back-end.
      // If supplied, check both the by and partition entities are in the terms.
      const detector = job.analysis_config.detectors[detectorIndex];
      const detectorHasPartitionField = Object.hasOwn(detector, 'partition_field_name');
      const detectorHasByField = Object.hasOwn(detector, 'by_field_name');
      const terms = termsStr.split(',');

      if (detectorHasPartitionField) {
        const partitionEntity = entityFields.find(
          (entityField) => entityField.fieldName === detector.partition_field_name
        );
        isEnabled =
          partitionEntity?.fieldValue !== undefined &&
          terms.indexOf(String(partitionEntity.fieldValue)) !== -1;
      }

      if (isEnabled === true && detectorHasByField === true) {
        const byEntity = entityFields.find(
          (entityField) => entityField.fieldName === detector.by_field_name
        );
        isEnabled =
          byEntity?.fieldValue !== undefined && terms.indexOf(String(byEntity.fieldValue)) !== -1;
      }
    }
  }

  return isEnabled;
}
