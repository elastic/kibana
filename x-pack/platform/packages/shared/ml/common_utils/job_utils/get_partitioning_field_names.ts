/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CombinedJob } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';

// Returns the names of the partition, by, and over fields for the detector with the
// specified index from the supplied ML job configuration.
export function getPartitioningFieldNames(job: CombinedJob, detectorIndex: number): string[] {
  const fieldNames: string[] = [];
  const detector = job.analysis_config.detectors[detectorIndex];
  if (typeof detector.partition_field_name === 'string') {
    fieldNames.push(detector.partition_field_name);
  }
  if (typeof detector.by_field_name === 'string') {
    fieldNames.push(detector.by_field_name);
  }
  if (typeof detector.over_field_name === 'string') {
    fieldNames.push(detector.over_field_name);
  }

  return fieldNames;
}
