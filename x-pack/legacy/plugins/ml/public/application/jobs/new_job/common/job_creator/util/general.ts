/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Job, Datafeed, Detector } from '../configs';
import { newJobCapsService } from '../../../../../services/new_job_capabilities_service';
import {
  ML_JOB_AGGREGATION,
  SPARSE_DATA_AGGREGATIONS,
} from '../../../../../../../common/constants/aggregation_types';
import { MLCATEGORY } from '../../../../../../../common/constants/field_types';
import {
  EVENT_RATE_FIELD_ID,
  Field,
  AggFieldPair,
  mlCategory,
} from '../../../../../../../common/types/fields';
import { mlJobService } from '../../../../../services/job_service';
import { JobCreatorType, isMultiMetricJobCreator, isPopulationJobCreator } from '../index';
import { CREATED_BY_LABEL, JOB_TYPE } from '../../../../../../../common/constants/new_job';

const getFieldByIdFactory = (scriptFields: Field[]) => (id: string) => {
  let field = newJobCapsService.getFieldById(id);
  // if no field could be found it may be a pretend field, like mlcategory or a script field
  if (field === null) {
    if (id === MLCATEGORY) {
      field = mlCategory;
    } else if (scriptFields.length) {
      field = scriptFields.find(f => f.id === id) || null;
    }
  }
  return field;
};

// populate the detectors with Field and Agg objects loaded from the job capabilities service
export function getRichDetectors(
  job: Job,
  datafeed: Datafeed,
  scriptFields: Field[],
  advanced: boolean = false
) {
  const detectors = advanced ? getDetectorsAdvanced(job, datafeed) : getDetectors(job, datafeed);

  const getFieldById = getFieldByIdFactory(scriptFields);

  return detectors.map(d => {
    let field = null;
    let byField = null;
    let overField = null;
    let partitionField = null;

    if (d.field_name !== undefined) {
      field = getFieldById(d.field_name);
    }
    if (d.by_field_name !== undefined) {
      byField = getFieldById(d.by_field_name);
    }
    if (d.over_field_name !== undefined) {
      overField = getFieldById(d.over_field_name);
    }
    if (d.partition_field_name !== undefined) {
      partitionField = getFieldById(d.partition_field_name);
    }

    return {
      agg: newJobCapsService.getAggById(d.function),
      field,
      byField,
      overField,
      partitionField,
      excludeFrequent: d.exclude_frequent || null,
      description: d.detector_description || null,
    };
  });
}

export function createFieldOptions(fields: Field[]) {
  return fields
    .filter(f => f.id !== EVENT_RATE_FIELD_ID)
    .map(f => ({
      label: f.name,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function createScriptFieldOptions(scriptFields: Field[]) {
  return scriptFields.map(f => ({
    label: f.id,
  }));
}

export function createMlcategoryFieldOption(categorizationFieldName: string | null) {
  if (categorizationFieldName === null) {
    return [];
  }
  return [
    {
      label: MLCATEGORY,
    },
  ];
}

function getDetectorsAdvanced(job: Job, datafeed: Datafeed) {
  return processFieldlessAggs(job.analysis_config.detectors);
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
    const field = datafeed?.aggregations?.buckets?.aggregations?.dc_region?.cardinality
      ?.field as string;

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
    detectors = processFieldlessAggs(detectors);
    detectors = detectors.map(d => {
      switch (d.function) {
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

// if a fieldless function is used, add EVENT_RATE_FIELD_ID as its field
function processFieldlessAggs(detectors: Detector[]) {
  return detectors.map(d => {
    switch (d.function) {
      case ML_JOB_AGGREGATION.COUNT:
      case ML_JOB_AGGREGATION.HIGH_COUNT:
      case ML_JOB_AGGREGATION.LOW_COUNT:
      case ML_JOB_AGGREGATION.NON_ZERO_COUNT:
      case ML_JOB_AGGREGATION.HIGH_NON_ZERO_COUNT:
      case ML_JOB_AGGREGATION.LOW_NON_ZERO_COUNT:
      case ML_JOB_AGGREGATION.RARE:
      case ML_JOB_AGGREGATION.FREQ_RARE:
      case ML_JOB_AGGREGATION.TIME_OF_DAY:
      case ML_JOB_AGGREGATION.TIME_OF_WEEK:
        return { ...d, field_name: EVENT_RATE_FIELD_ID };
      default:
        return d;
    }
  });
}

// determine whether the job has been configured to run on sparse data
// by looking to see whether the datafeed contains a dc_region field in an aggregation
// if it does, it is a distinct count single metric job and no a sparse data job.
// this check is needed because distinct count jobs also use NON_ZERO_COUNT
export function isSparseDataJob(job: Job, datafeed: Datafeed): boolean {
  const detectors = job.analysis_config.detectors;

  const distinctCountField = datafeed?.aggregations?.buckets?.aggregations?.dc_region?.cardinality
    ?.field as string;

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

function stashCombinedJob(
  jobCreator: JobCreatorType,
  skipTimeRangeStep: boolean = false,
  includeTimeRange: boolean = false
) {
  const combinedJob = {
    ...jobCreator.jobConfig,
    datafeed_config: jobCreator.datafeedConfig,
  };

  mlJobService.tempJobCloningObjects.job = combinedJob;

  // skip over the time picker step of the wizard
  mlJobService.tempJobCloningObjects.skipTimeRangeStep = skipTimeRangeStep;

  if (includeTimeRange === true) {
    // auto select the start and end dates of the time picker
    mlJobService.tempJobCloningObjects.start = jobCreator.start;
    mlJobService.tempJobCloningObjects.end = jobCreator.end;
  }

  mlJobService.tempJobCloningObjects.calendars = jobCreator.calendars;
}

export function convertToMultiMetricJob(jobCreator: JobCreatorType) {
  jobCreator.createdBy = CREATED_BY_LABEL.MULTI_METRIC;
  jobCreator.modelPlot = false;
  stashCombinedJob(jobCreator, true, true);

  window.location.href = window.location.href.replace(
    JOB_TYPE.SINGLE_METRIC,
    JOB_TYPE.MULTI_METRIC
  );
}

export function convertToAdvancedJob(jobCreator: JobCreatorType) {
  jobCreator.createdBy = null;
  stashCombinedJob(jobCreator, true, true);

  let jobType = JOB_TYPE.SINGLE_METRIC;
  if (isMultiMetricJobCreator(jobCreator)) {
    jobType = JOB_TYPE.MULTI_METRIC;
  } else if (isPopulationJobCreator(jobCreator)) {
    jobType = JOB_TYPE.POPULATION;
  }

  window.location.href = window.location.href.replace(jobType, JOB_TYPE.ADVANCED);
}

export function resetJob(jobCreator: JobCreatorType) {
  jobCreator.jobId = '';
  stashCombinedJob(jobCreator, true, true);

  window.location.href = '#/jobs/new_job';
}

export function advancedStartDatafeed(jobCreator: JobCreatorType) {
  stashCombinedJob(jobCreator, false, false);
  window.location.href = '#/jobs';
}

export function aggFieldPairsCanBeCharted(afs: AggFieldPair[]) {
  return afs.some(a => a.agg.dslName === null) === false;
}
