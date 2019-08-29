/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { idx } from '@kbn/elastic-idx';
import { Job, Datafeed } from '../configs';
import { newJobCapsService } from '../../../../../services/new_job_capabilities_service';
import {
  ML_JOB_AGGREGATION,
  SPARSE_DATA_AGGREGATIONS,
} from '../../../../../../common/constants/aggregation_types';
import { EVENT_RATE_FIELD_ID } from '../../../../../../common/types/fields';
import { mlJobService } from '../../../../../services/job_service';
import { JobCreator } from '../job_creator';
import { CREATED_BY_LABEL } from './constants';

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
  const sparseData = isSparseDataJob(job, datafeed);

  // if aggregations have been used in a single metric job and a distinct count detector
  // was used, we need to rebuild the detector.
  if (
    datafeed.aggregations !== undefined &&
    job.analysis_config.detectors[0].function === ML_JOB_AGGREGATION.NON_ZERO_COUNT &&
    sparseData === false
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
  } else {
    // all other detectors.
    detectors = detectors.map(d => {
      switch (d.function) {
        // if a count function is used, add EVENT_RATE_FIELD_ID as its field
        case ML_JOB_AGGREGATION.COUNT:
          return { ...d, field_name: EVENT_RATE_FIELD_ID };

        case ML_JOB_AGGREGATION.HIGH_COUNT:
          return { ...d, field_name: EVENT_RATE_FIELD_ID };

        case ML_JOB_AGGREGATION.LOW_COUNT:
          return { ...d, field_name: EVENT_RATE_FIELD_ID };

        // if sparse data functions were used, replace them with their non-sparse versions
        // the sparse data flag has already been determined and set, so this information is not being lost.
        case ML_JOB_AGGREGATION.NON_ZERO_COUNT:
          return { ...d, field_name: EVENT_RATE_FIELD_ID, function: ML_JOB_AGGREGATION.COUNT };

        case ML_JOB_AGGREGATION.HIGH_NON_ZERO_COUNT:
          return { ...d, field_name: EVENT_RATE_FIELD_ID, function: ML_JOB_AGGREGATION.HIGH_COUNT };

        case ML_JOB_AGGREGATION.LOW_NON_ZERO_COUNT:
          return { ...d, field_name: EVENT_RATE_FIELD_ID, function: ML_JOB_AGGREGATION.LOW_COUNT };

        case ML_JOB_AGGREGATION.NON_NULL_SUM:
          return { ...d, function: ML_JOB_AGGREGATION.SUM };

        case ML_JOB_AGGREGATION.HIGH_NON_NULL_SUM:
          return { ...d, function: ML_JOB_AGGREGATION.HIGH_SUM };

        case ML_JOB_AGGREGATION.LOW_NON_NULL_SUM:
          return { ...d, function: ML_JOB_AGGREGATION.LOW_SUM };

        default:
          return d;
      }
    });
  }
  return detectors;
}

// determine whether the job has been configured to run on sparse data
// by looking to see whether the datafeed contains a dc_region field in an aggregation
// if it does, it is a distinct count single metric job and no a sparse data job.
// this check is needed because distinct count jobs also use NON_ZERO_COUNT
export function isSparseDataJob(job: Job, datafeed: Datafeed): boolean {
  const detectors = job.analysis_config.detectors;

  const distinctCountField = idx<Datafeed, string>(
    datafeed,
    _ => _.aggregations.buckets.aggregations.dc_region.cardinality.field
  );
  // if distinctCountField is undefined, and any detectors contain a sparse data function
  // return true
  if (distinctCountField === undefined) {
    for (const detector of detectors) {
      if (SPARSE_DATA_AGGREGATIONS.includes(detector.function as ML_JOB_AGGREGATION)) {
        return true;
      }
    }
  }
  return false;
}

function stashCombinedJob(jobCreator: JobCreator, skipTimeRangeStep: boolean = false) {
  mlJobService.tempJobCloningObjects.job = {
    ...jobCreator.jobConfig,
    datafeed_config: jobCreator.datafeedConfig,
  };

  if (skipTimeRangeStep === true) {
    mlJobService.tempJobCloningObjects.skipTimeRangeStep = true;
  }
}

export function convertToMultiMetricJob(jobCreator: JobCreator) {
  jobCreator.createdBy = CREATED_BY_LABEL.MULTI_METRIC;
  stashCombinedJob(jobCreator, true);

  window.location.href = window.location.href.replace('single_metric', 'multi_metric');
}

export function convertToAdvancedJob(jobCreator: JobCreator) {
  jobCreator.createdBy = null;
  stashCombinedJob(jobCreator);

  window.location.href = window.location.href.replace('multi_metric', 'advanced');
}

export function resetJob(jobCreator: JobCreator) {
  jobCreator.jobId = '';
  stashCombinedJob(jobCreator, true);

  window.location.href = '#/jobs/new_job';
}
