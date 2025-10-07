/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { each, isEmpty, pick } from 'lodash';
import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { MlServerLimits } from '@kbn/ml-common-types/ml_server_info';
import { maxLengthValidator, JOB_ID_MAX_LENGTH } from '@kbn/ml-validators';
import { MLCATEGORY } from '@kbn/ml-anomaly-utils/field_types';

import type { ValidationResults } from './validation_results';
import { isJobIdValid } from './is_job_id_valid';
import { validateGroupNames } from './validate_group_names';
import { validateModelMemoryLimitUnits } from './validate_model_memory_limit_units';
import { validateModelMemoryLimit } from './validate_model_memory_limit';
import { uniqWithIsEqual } from './uniq_with_is_equal';
import { parseTimeIntervalForJob } from './parse_time_interval_for_job';

// Checks that the value for a field which represents a time interval,
// such as a job bucket span or datafeed query delay, is valid.
function isValidTimeInterval(value: string | number | undefined): boolean {
  if (value === undefined) {
    return true;
  }
  return parseTimeIntervalForJob(value) !== null;
}

// check job without manipulating UI and return a list of messages
// job and fields get passed as arguments and are not accessed as $scope.* via the outer scope
// because the plan is to move this function to the common code area so that it can be used on the server side too.
export function basicJobValidation(
  job: Job,
  fields: object | undefined,
  limits: MlServerLimits,
  skipMmlChecks = false
): ValidationResults {
  const messages: ValidationResults['messages'] = [];
  let valid = true;

  if (job) {
    // Job details
    if (isEmpty(job.job_id)) {
      messages.push({ id: 'job_id_empty' });
      valid = false;
    } else if (isJobIdValid(job.job_id) === false) {
      messages.push({ id: 'job_id_invalid' });
      valid = false;
    } else if (maxLengthValidator(JOB_ID_MAX_LENGTH)(job.job_id)) {
      messages.push({ id: 'job_id_invalid_max_length', maxLength: JOB_ID_MAX_LENGTH });
      valid = false;
    } else {
      messages.push({ id: 'job_id_valid' });
    }

    // group names
    const { messages: groupsMessages, valid: groupsValid } = validateGroupNames(job);

    messages.push(...groupsMessages);
    valid = valid && groupsValid;

    // Analysis Configuration
    if (job.analysis_config.categorization_filters) {
      let v = true;
      each(job.analysis_config.categorization_filters, (d) => {
        try {
          new RegExp(d);
        } catch (e) {
          v = false;
        }

        if (
          job.analysis_config.categorization_field_name === undefined ||
          job.analysis_config.categorization_field_name === ''
        ) {
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
    let categorizerDetectorMissingPartitionField = false;
    if (job.analysis_config.detectors.length === 0) {
      messages.push({ id: 'detectors_empty' });
      valid = false;
    } else {
      let v = true;

      each(job.analysis_config.detectors, (d) => {
        if (isEmpty(d.function)) {
          v = false;
        }
        // if detector has an ml category, check if the partition_field is missing
        const needToHavePartitionFieldName =
          job.analysis_config.per_partition_categorization?.enabled === true &&
          (d.by_field_name === MLCATEGORY || d.over_field_name === MLCATEGORY);

        if (needToHavePartitionFieldName && d.partition_field_name === undefined) {
          categorizerDetectorMissingPartitionField = true;
        }
      });
      if (v) {
        messages.push({ id: 'detectors_function_not_empty' });
      } else {
        messages.push({ id: 'detectors_function_empty' });
        valid = false;
      }
      if (categorizerDetectorMissingPartitionField) {
        messages.push({ id: 'categorizer_detector_missing_per_partition_field' });
        valid = false;
      }
    }

    if (job.analysis_config.detectors.length >= 2) {
      // check if the detectors with mlcategory might have different per_partition_field values
      // if per_partition_categorization is enabled
      if (job.analysis_config.per_partition_categorization !== undefined) {
        if (
          job.analysis_config.per_partition_categorization.enabled ||
          (job.analysis_config.per_partition_categorization.stop_on_warn &&
            Array.isArray(job.analysis_config.detectors) &&
            job.analysis_config.detectors.length >= 2)
        ) {
          const categorizationDetectors = job.analysis_config.detectors.filter(
            (d) =>
              d.by_field_name === MLCATEGORY ||
              d.over_field_name === MLCATEGORY ||
              d.partition_field_name === MLCATEGORY
          );
          const uniqPartitions = [
            ...new Set(
              categorizationDetectors
                .map((d) => d.partition_field_name)
                .filter((name) => name !== undefined)
            ),
          ];
          if (uniqPartitions.length > 1) {
            valid = false;
            messages.push({
              id: 'categorizer_varying_per_partition_fields',
              fields: uniqPartitions.join(', '),
            });
          }
        }
      }

      // check for duplicate detectors
      // create an array of objects with a subset of the attributes
      // where we want to make sure they are not be the same across detectors
      const compareSubSet = job.analysis_config.detectors.map((d) =>
        pick(d, [
          'function',
          'field_name',
          'by_field_name',
          'over_field_name',
          'partition_field_name',
        ])
      );

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

    if (job.analysis_config.bucket_span === '' || job.analysis_config.bucket_span === undefined) {
      messages.push({ id: 'bucket_span_empty' });
      valid = false;
    } else {
      if (isValidTimeInterval(job.analysis_config.bucket_span)) {
        messages.push({
          id: 'bucket_span_valid',
          bucketSpan: job.analysis_config.bucket_span,
        });
      } else {
        messages.push({ id: 'bucket_span_invalid' });
        valid = false;
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
      const mml = job.analysis_limits && job.analysis_limits.model_memory_limit;
      const { messages: mmlUnitMessages, valid: mmlUnitValid } = validateModelMemoryLimitUnits(
        mml as string | undefined
      );

      messages.push(...mmlUnitMessages);
      valid = valid && mmlUnitValid;

      if (mmlUnitValid) {
        // if mml is a valid format,
        // run the validation against max mml
        const { messages: mmlMessages, valid: mmlValid } = validateModelMemoryLimit(job, limits);

        messages.push(...mmlMessages);
        valid = valid && mmlValid;
      }
    }
  } else {
    valid = false;
  }

  return {
    messages,
    valid,
    contains: (id) => messages.some((m) => id === m.id),
    find: (id) => messages.find((m) => id === m.id),
  };
}
