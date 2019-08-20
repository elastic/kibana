/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { mlJobService } from 'plugins/ml/services/job_service';
import { populateAppStateSettings } from 'plugins/ml/jobs/new_job/simple/components/utils/app_state_settings';
import { WIZARD_TYPE } from 'plugins/ml/jobs/new_job/simple/components/constants/general';
import { setFullTimeRange } from '../../../../../components/full_time_range_selector/full_time_range_selector_service';


export function preLoadJob($scope, appState) {
  const job = mlJobService.currentJob;
  mlJobService.currentJob = undefined;
  if (job !== undefined) {
    const mlJobSettings = jobSettingsFromJob(job, $scope.ui.aggTypeOptions);
    populateAppStateSettings({ mlJobSettings }, $scope);
    setFullTimeRange($scope.ui.indexPattern, $scope.formConfig.combinedQuery)
      .then(() => $scope.loadVis())
      .catch(() => $scope.loadVis());
  } else {
    // populate the fields with any settings from the URL
    populateAppStateSettings(appState, $scope);
  }
}


export function jobSettingsFromJob(job, aggTypeOptions) {
  if (job.custom_settings === undefined) {
    return {};
  }

  function getKibanaAggName(mlAggName) {
    const agg = aggTypeOptions.find(a => a.mlName === mlAggName);
    return (agg) ? agg.mlName : undefined;
  }

  const jobSettings = {};

  const dtrs = job.analysis_config.detectors;

  if (job.custom_settings.created_by === WIZARD_TYPE.SINGLE_METRIC) {
    // single metric
    const d = dtrs[0];
    let func = d.function;

    // distinct_count jobs in single metric wizard use a particular aggregation where
    // the detector function is replaced as non_zero_count.
    // here we look for this exact situation and switch the function back to distinct_count
    if (
      func === 'non_zero_count' &&
      job.analysis_config.summary_count_field_name !== undefined &&
      job.analysis_config.summary_count_field_name.match(/^dc_.+/)) {
      func = 'distinct_count';
    }

    const field = { agg: getKibanaAggName(func) };
    if (d.field_name) {
      field.fieldName = d.field_name;
    } else if (func === 'distinct_count' && job.analysis_config.summary_count_field_name !== undefined) {
      const fieldMatch = job.analysis_config.summary_count_field_name.match(/^dc_(.+)/);
      if (fieldMatch[1] !== undefined) {
        field.fieldName = fieldMatch[1];
      }
    }

    jobSettings.fields = [field];
  } else if (job.custom_settings.created_by === WIZARD_TYPE.MULTI_METRIC) {
    // multi metric
    let splitField = '';

    jobSettings.fields = dtrs.map((d) => {
      if (d.partition_field_name) {
        splitField = d.partition_field_name;
      }

      const field = { agg: getKibanaAggName(d.function) };
      if (d.field_name) {
        field.fieldName = d.field_name;
      }
      return field;
    });

    if (splitField !== '') {
      jobSettings.split = splitField;
    }

  } else if (job.custom_settings.created_by === WIZARD_TYPE.POPULATION) {
    let overField = '';
    const splitFields = {};

    jobSettings.fields = dtrs.map((d) => {
      // population
      if (d.over_field_name) {
        overField = d.over_field_name;
      }

      const field = { agg: getKibanaAggName(d.function) };
      if (d.field_name) {
        field.fieldName = d.field_name;
      }

      if (d.by_field_name) {
        field.split = d.by_field_name;
      }

      return field;
    });

    if (overField !== '') {
      jobSettings.population = overField;
    }

    const numberOfSplits = Object.keys(splitFields).length;

    if (numberOfSplits > 0) {
      if (numberOfSplits > 1) {
        // multiple splits, population or advanced job
        for (const f in splitFields) {
          if (splitFields.hasOwnProperty(f)) {
            const i = splitFields[f];
            jobSettings.fields[i] = f;
          }
        }
      } else {
        jobSettings.split = Object.keys(splitFields)[0];
      }
    }
  }


  jobSettings.bucketSpan = job.analysis_config.bucket_span;
  if (job.analysis_limits && job.analysis_limits.model_memory_limit) {
    jobSettings.modelMemoryLimit = job.analysis_limits.model_memory_limit;
  }

  if (job.description !== '') {
    jobSettings.description = job.description;
  }

  if (job.groups !== undefined && job.groups.length) {
    jobSettings.groups = job.groups;
  }

  if (job.analysis_config && job.analysis_config.influencers) {
    jobSettings.influencers = job.analysis_config.influencers;
  }

  jobSettings.resultsIndexName = job.results_index_name;

  return jobSettings;
}
