/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { idx } from '@kbn/elastic-idx';
import { Job, Datafeed } from '../configs';
import { newJobCapsService } from '../../../../../services/new_job_capabilities_service';
import { ML_JOB_AGGREGATION } from '../../../../../../common/constants/aggregation_types';

// populate the detectors with Field and Agg objects loaded from the job capabilities service
export function getRichDetectors(job: Job, datafeed: Datafeed) {
  const detectors = getDetectors(job, datafeed);
  return detectors.map(d => {
    return {
      agg: newJobCapsService.getAggById(d.function),
      field: d.field_name !== undefined ? newJobCapsService.getFieldById(d.field_name) : null,
      byField:
        d.by_field_name !== undefined ? newJobCapsService.getFieldById(d.by_field_name) : null,
      overField:
        d.over_field_name !== undefined ? newJobCapsService.getFieldById(d.over_field_name) : null,
      partitionField:
        d.partition_field_name !== undefined
          ? newJobCapsService.getFieldById(d.partition_field_name)
          : null,
    };
  });
}

function getDetectors(job: Job, datafeed: Datafeed) {
  let detectors = job.analysis_config.detectors;

  // if aggregations have been used in a single metric job and a distinct count detector
  // was used, we need to rebuild the detector.
  if (
    datafeed.aggregations !== undefined &&
    job.analysis_config.detectors[0].function === ML_JOB_AGGREGATION.NON_ZERO_COUNT
  ) {
    // distinct count detector, field has been removed.
    // determine field from datafeed aggregations
    const field = idx<Datafeed, string>(
      datafeed,
      _ => _.aggregations.buckets.aggregations.dc_region.cardinality.field
    );
    if (field !== undefined) {
      detectors = [
        {
          function: ML_JOB_AGGREGATION.DISTINCT_COUNT,
          field_name: field,
        },
      ];
    }
  }
  return detectors;
}
