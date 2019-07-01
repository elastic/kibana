/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import _ from 'lodash';
import semver from 'semver';
import numeral from '@elastic/numeral';

import { ALLOWED_DATA_UNITS } from '../constants/validation';
import { parseInterval } from './parse_interval';

// work out the default frequency based on the bucket_span in seconds
export function calculateDatafeedFrequencyDefaultSeconds(bucketSpanSeconds) {

  let freq = 3600;
  if (bucketSpanSeconds <= 120) {
    freq = 60;
  } else if (bucketSpanSeconds <= 1200) {
    freq = Math.floor(bucketSpanSeconds / 2);
  } else if (bucketSpanSeconds <= 43200) {
    freq = 600;
  }

  return freq;
}

// Returns a flag to indicate whether the job is suitable for viewing
// in the Time Series dashboard.
export function isTimeSeriesViewJob(job) {
  // only allow jobs with at least one detector whose function corresponds to
  // an ES aggregation which can be viewed in the single metric view and which
  // doesn't use a scripted field which can be very difficult or impossible to
  // invert to a reverse search, or when model plot has been enabled.
  let isViewable = false;
  const dtrs = job.analysis_config.detectors;

  for (let i = 0; i < dtrs.length; i++) {
    isViewable = isTimeSeriesViewDetector(job, i);
    if (isViewable === true) {
      break;
    }
  }

  return isViewable;
}

// Returns a flag to indicate whether the detector at the index in the specified job
// is suitable for viewing in the Time Series dashboard.
export function isTimeSeriesViewDetector(job, dtrIndex) {
  return isSourceDataChartableForDetector(job, dtrIndex) ||
    isModelPlotChartableForDetector(job, dtrIndex);
}

// Returns a flag to indicate whether the source data can be plotted in a time
// series chart for the specified detector.
export function isSourceDataChartableForDetector(job, detectorIndex) {
  let isSourceDataChartable = false;
  const dtrs = job.analysis_config.detectors;
  if (detectorIndex >= 0 && detectorIndex < dtrs.length) {
    const dtr = dtrs[detectorIndex];
    const functionName = dtr.function;

    // Check that the function maps to an ES aggregation,
    // and that the partitioning field isn't mlcategory
    // (since mlcategory is a derived field which won't exist in the source data).
    // Note that the 'function' field in a record contains what the user entered e.g. 'high_count',
    // whereas the 'function_description' field holds an ML-built display hint for function e.g. 'count'.
    isSourceDataChartable = (mlFunctionToESAggregation(functionName) !== null) &&
      (dtr.by_field_name !== 'mlcategory') &&
      (dtr.partition_field_name !== 'mlcategory') &&
      (dtr.over_field_name !== 'mlcategory');

    // If the datafeed uses script fields, we can only plot the time series if
    // model plot is enabled. Without model plot it will be very difficult or impossible
    // to invert to a reverse search of the underlying metric data.
    const usesScriptFields = _.has(job, 'datafeed_config.script_fields');
    if (isSourceDataChartable === true && usesScriptFields === true) {
      // Perform extra check to see if the detector is using a scripted field.
      const scriptFields = usesScriptFields ? _.keys(job.datafeed_config.script_fields) : [];
      isSourceDataChartable = (
        scriptFields.indexOf(dtr.field_name) === -1 &&
        scriptFields.indexOf(dtr.partition_field_name) === -1 &&
        scriptFields.indexOf(dtr.by_field_name) === -1 &&
        scriptFields.indexOf(dtr.over_field_name) === -1);
    }

  }

  return isSourceDataChartable;
}

// Returns a flag to indicate whether model plot data can be plotted in a time
// series chart for the specified detector.
export function isModelPlotChartableForDetector(job, detectorIndex) {
  let isModelPlotChartable = false;

  const modelPlotEnabled = _.get(job, ['model_plot_config', 'enabled'], false);
  const dtrs = job.analysis_config.detectors;
  if (detectorIndex >= 0 && detectorIndex < dtrs.length && modelPlotEnabled === true) {
    const dtr = dtrs[detectorIndex];
    const functionName = dtr.function;

    // Model plot can be charted for any of the functions which map to ES aggregations,
    // plus varp and info_content functions.
    isModelPlotChartable = (mlFunctionToESAggregation(functionName) !== null) ||
      (['varp', 'high_varp', 'low_varp', 'info_content',
        'high_info_content', 'low_info_content'].includes(functionName) === true);
  }

  return isModelPlotChartable;

}

// Returns the names of the partition, by, and over fields for the detector with the
// specified index from the supplied ML job configuration.
export function getPartitioningFieldNames(job, detectorIndex) {
  const fieldNames = [];
  const detector = job.analysis_config.detectors[detectorIndex];
  if (_.has(detector, 'partition_field_name')) {
    fieldNames.push(detector.partition_field_name);
  }
  if (_.has(detector, 'by_field_name')) {
    fieldNames.push(detector.by_field_name);
  }
  if (_.has(detector, 'over_field_name')) {
    fieldNames.push(detector.over_field_name);
  }

  return fieldNames;
}

// Returns a flag to indicate whether model plot has been enabled for a job.
// If model plot is enabled for a job with a terms filter (comma separated
// list of partition or by field names), performs additional checks that
// the supplied entities contains 'by' and 'partition' fields in the detector,
// if configured, whose values are in the configured model_plot_config terms,
// where entityFields is in the format [{fieldName:status, fieldValue:404}].
export function isModelPlotEnabled(job, detectorIndex, entityFields) {
  // Check if model_plot_config is enabled.
  let isEnabled = _.get(job, ['model_plot_config', 'enabled'], false);

  if (isEnabled === true && entityFields !== undefined && entityFields.length > 0) {
    // If terms filter is configured in model_plot_config, check supplied entities.
    const termsStr = _.get(job, ['model_plot_config', 'terms'], '');
    if (termsStr !== '') {
      // NB. Do not currently support empty string values as being valid 'by' or
      // 'partition' field values even though this is supported on the back-end.
      // If supplied, check both the by and partition entities are in the terms.
      const detector = job.analysis_config.detectors[detectorIndex];
      const detectorHasPartitionField = _.has(detector, 'partition_field_name');
      const detectorHasByField = _.has(detector, 'by_field_name');
      const terms = termsStr.split(',');

      if (detectorHasPartitionField === true) {
        const partitionEntity = _.find(entityFields, { 'fieldName': detector.partition_field_name });
        isEnabled = partitionEntity !== undefined && terms.indexOf(partitionEntity.fieldValue) !== -1;
      }

      if (isEnabled === true && detectorHasByField === true) {
        const byEntity = _.find(entityFields, { 'fieldName': detector.by_field_name });
        isEnabled = byEntity !== undefined && terms.indexOf(byEntity.fieldValue) !== -1;
      }
    }
  }

  return isEnabled;
}

// Returns whether the version of the job (the version number of the elastic stack that the job was
// created with) is greater than or equal to the supplied version (e.g. '6.1.0').
export function isJobVersionGte(job, version) {
  const jobVersion = _.get(job, 'job_version', '0.0.0');
  return semver.gte(jobVersion, version);
}

// Takes an ML detector 'function' and returns the corresponding ES aggregation name
// for querying metric data. Returns null if there is no suitable ES aggregation.
// Note that the 'function' field in a record contains what the user entered e.g. 'high_count',
// whereas the 'function_description' field holds an ML-built display hint for function e.g. 'count'.
export function mlFunctionToESAggregation(functionName) {
  if (functionName === 'mean' || functionName === 'high_mean' || functionName === 'low_mean' ||
    functionName === 'metric') {
    return 'avg';
  }

  if (functionName === 'sum' || functionName === 'high_sum' || functionName === 'low_sum' ||
    functionName === 'non_null_sum' || functionName === 'low_non_null_sum' || functionName === 'high_non_null_sum') {
    return 'sum';
  }

  if (functionName === 'count' || functionName === 'high_count' || functionName === 'low_count' ||
    functionName === 'non_zero_count' || functionName === 'low_non_zero_count' || functionName === 'high_non_zero_count') {
    return 'count';
  }

  if (functionName === 'distinct_count' || functionName === 'low_distinct_count' || functionName === 'high_distinct_count') {
    return 'cardinality';
  }

  if (functionName === 'median' || functionName === 'high_median' || functionName === 'low_median') {
    return 'percentiles';
  }

  if (functionName === 'min' || functionName === 'max') {
    return functionName;
  }

  if (functionName === 'rare') {
    return 'count';
  }

  // Return null if ML function does not map to an ES aggregation.
  // i.e. median, low_median, high_median, freq_rare,
  // varp, low_varp, high_varp, time_of_day, time_of_week, lat_long,
  // info_content, low_info_content, high_info_content
  return null;
}

// Job name must contain lowercase alphanumeric (a-z and 0-9), hyphens or underscores;
// it must also start and end with an alphanumeric character'
export function isJobIdValid(jobId) {
  return (jobId.match(/^[a-z0-9\-\_]{1,64}$/g) && !jobId.match(/^([_-].*)?(.*[_-])?$/g)) ? true : false;
}

// To get median data for jobs and charts we need to use Elasticsearch's
// percentiles aggregation. This setting is used with the `percents` field
// of the percentiles aggregation to get the correct data.
export const ML_MEDIAN_PERCENTS = '50.0';

// The number of preview items to show up in
// the Advanced Job Configuration data/datafeed preview tab
export const ML_DATA_PREVIEW_COUNT = 10;

// add a prefix to a datafeed id before the "datafeed-" part of the name
export function prefixDatafeedId(datafeedId, prefix) {
  return (datafeedId.match(/^datafeed-/)) ?
    datafeedId.replace(/^datafeed-/, `datafeed-${prefix}`) :
    `${prefix}${datafeedId}`;
}

// Returns a name which is safe to use in elasticsearch aggregations for the supplied
// field name. Aggregation names must be alpha-numeric and can only contain '_' and '-' characters,
// so if the supplied field names contains disallowed characters, the provided index
// identifier is used to return a safe 'dummy' name in the format 'field_index' e.g. field_0, field_1
export function getSafeAggregationName(fieldName, index) {
  return fieldName.match(/^[a-zA-Z0-9-_.]+$/) ? fieldName : `field_${index}`;
}

export function uniqWithIsEqual(arr) {
  return arr.reduce((dedupedArray, value) => {
    if (
      dedupedArray.filter(
        compareValue => _.isEqual(compareValue, value)
      ).length === 0
    ) {
      dedupedArray.push(value);
    }
    return dedupedArray;
  }, []);
}

// check job without manipulating UI and return a list of messages
// job and fields get passed as arguments and are not accessed as $scope.* via the outer scope
// because the plan is to move this function to the common code area so that it can be used on the server side too.
export function basicJobValidation(job, fields, limits, skipMmlChecks = false) {
  const messages = [];
  let valid = true;

  if (job) {
    // Job details
    if (_.isEmpty(job.job_id)) {
      messages.push({ id: 'job_id_empty' });
      valid = false;
    } else if (isJobIdValid(job.job_id) === false) {
      messages.push({ id: 'job_id_invalid' });
      valid = false;
    } else {
      messages.push({ id: 'job_id_valid' });
    }

    // group names
    const {
      messages: groupsMessages,
      valid: groupsValid,
    } = validateGroupNames(job);

    messages.push(...groupsMessages);
    valid = (valid && groupsValid);

    // Analysis Configuration
    if (job.analysis_config.categorization_filters) {
      let v = true;
      _.each(job.analysis_config.categorization_filters, (d) => {
        try {
          new RegExp(d);
        } catch (e) {
          v = false;
        }

        if (job.analysis_config.categorization_field_name === undefined || job.analysis_config.categorization_field_name === '') {
          v = false;
        }

        if (d === '') {
          v = false;
        }
      });

      if (v) {
        messages.push({ id: 'categorization_filters_valid' });
      } else {
        messages.push({ id: 'categorization_filters_invalid' });
        valid = false;
      }
    }

    if (job.analysis_config.detectors.length === 0) {
      messages.push({ id: 'detectors_empty' });
      valid = false;
    } else {
      let v = true;
      _.each(job.analysis_config.detectors, (d) => {
        if (_.isEmpty(d.function)) {
          v = false;
        }
      });
      if (v) {
        messages.push({ id: 'detectors_function_not_empty' });
      } else {
        messages.push({ id: 'detectors_function_empty' });
        valid = false;
      }
    }

    // check for duplicate detectors
    if (job.analysis_config.detectors.length >= 2) {
      // create an array of objects with a subset of the attributes
      // where we want to make sure they are not be the same across detectors
      const compareSubSet = job.analysis_config.detectors.map((d) => _.pick(d, [
        'function',
        'field_name',
        'by_field_name',
        'over_field_name',
        'partition_field_name'
      ]));

      const dedupedSubSet = uniqWithIsEqual(compareSubSet);

      if (compareSubSet.length !== dedupedSubSet.length) {
        messages.push({ id: 'detectors_duplicates' });
        valid = false;
      }
    }

    // we skip this influencer test because the client side form check is ignoring it
    // and the server side tests have their own influencer test
    // TODO: clarify if this is still needed or can be deleted
    /*
    if (job.analysis_config.influencers &&
      job.analysis_config.influencers.length === 0) {
      messages.push({ id: 'influencers_low' });
      valid = false;
    } else {
      messages.push({ id: 'success_influencers' });
    }
    */

    if (
      job.analysis_config.bucket_span === '' ||
      job.analysis_config.bucket_span === undefined
    ) {
      messages.push({ id: 'bucket_span_empty' });
      valid = false;
    } else {
      const bucketSpan = parseInterval(job.analysis_config.bucket_span, false);
      if (bucketSpan === null || bucketSpan.asMilliseconds() === 0) {
        messages.push({ id: 'bucket_span_invalid' });
        valid = false;
      } else {
        messages.push({
          id: 'bucket_span_valid',
          bucketSpan: job.analysis_config.bucket_span
        });
      }
    }

    // Datafeed
    if (typeof fields !== 'undefined') {
      const loadedFields = Object.keys(fields);
      if (loadedFields.length === 0) {
        messages.push({ id: 'index_fields_invalid' });
        valid = false;
      } else {
        messages.push({ id: 'index_fields_valid' });
      }
    }

    if (skipMmlChecks === false) {
      // model memory limit
      const {
        messages: mmlUnitMessages,
        valid: mmlUnitValid,
      } = validateModelMemoryLimitUnits(job);

      messages.push(...mmlUnitMessages);
      valid = (valid && mmlUnitValid);

      if (mmlUnitValid) {
        // if mml is a valid format,
        // run the validation against max mml
        const {
          messages: mmlMessages,
          valid: mmlValid,
        } = validateModelMemoryLimit(job, limits);

        messages.push(...mmlMessages);
        valid = (valid && mmlValid);
      }
    }

  } else {
    valid = false;
  }

  return {
    messages,
    valid,
    contains: id =>  (messages.some(m => id === m.id)),
    find: id => (messages.find(m => id === m.id)),
  };
}

export function validateModelMemoryLimit(job, limits) {
  const messages = [];
  let valid = true;
  // model memory limit
  if (typeof job.analysis_limits !== 'undefined' && typeof job.analysis_limits.model_memory_limit !== 'undefined') {
    if (typeof limits === 'object' && typeof limits.max_model_memory_limit !== 'undefined') {
      const max = limits.max_model_memory_limit.toUpperCase();
      const mml = job.analysis_limits.model_memory_limit.toUpperCase();

      const mmlBytes = numeral(mml).value();
      const maxBytes = numeral(max).value();

      if(mmlBytes > maxBytes) {
        messages.push({ id: 'model_memory_limit_invalid' });
        valid = false;
      } else {
        messages.push({ id: 'model_memory_limit_valid' });
      }
    }
  }
  return {
    valid,
    messages,
    contains: id =>  (messages.some(m => id === m.id)),
    find: id => (messages.find(m => id === m.id)),
  };
}

export function validateModelMemoryLimitUnits(job) {
  const messages = [];
  let valid = true;

  if (typeof job.analysis_limits !== 'undefined' && typeof job.analysis_limits.model_memory_limit !== 'undefined') {
    const mml = job.analysis_limits.model_memory_limit.toUpperCase();
    const mmlSplit = mml.match(/\d+(\w+)/);
    const unit = (mmlSplit && mmlSplit.length === 2) ? mmlSplit[1] : null;

    if (ALLOWED_DATA_UNITS.indexOf(unit) === -1) {
      messages.push({ id: 'model_memory_limit_units_invalid' });
      valid = false;
    } else {
      messages.push({ id: 'model_memory_limit_units_valid' });
    }
  }
  return {
    valid,
    messages,
    contains: id =>  (messages.some(m => id === m.id)),
    find: id => (messages.find(m => id === m.id)),
  };
}

export function validateGroupNames(job) {
  const messages = [];
  let valid = true;
  if (job.groups !== undefined) {
    let groupIdValid = true;
    job.groups.forEach(group => {
      if (isJobIdValid(group) === false) {
        groupIdValid = false;
        valid = false;
      }
    });
    if (job.groups.length > 0 && groupIdValid) {
      messages.push({ id: 'job_group_id_valid' });
    } else if (job.groups.length > 0 && !groupIdValid) {
      messages.push({ id: 'job_group_id_invalid' });
    }
  }
  return {
    valid,
    messages,
    contains: id =>  (messages.some(m => id === m.id)),
    find: id => (messages.find(m => id === m.id)),
  };
}
