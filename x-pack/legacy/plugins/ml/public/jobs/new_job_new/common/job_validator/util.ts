/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { BasicValidations } from './job_validator';
import { Job } from '../job_creator/configs';
import { ALLOWED_DATA_UNITS } from '../../../../../common/constants/validation';
import { newJobLimits } from '../../../new_job/utils/new_job_defaults';

export function populateValidationMessages(
  validationResults: any,
  basicValidations: BasicValidations,
  jobConfig: Job
) {
  const limits = newJobLimits();

  if (validationResults.contains('job_id_empty')) {
    basicValidations.jobId.valid = false;
  } else if (validationResults.contains('job_id_invalid')) {
    basicValidations.jobId.valid = false;
    const msg = i18n.translate(
      'xpack.ml.newJob.simple.validateJob.jobNameAllowedCharactersDescription',
      {
        defaultMessage:
          'Job name can contain lowercase alphanumeric (a-z and 0-9), hyphens or underscores; ' +
          'must start and end with an alphanumeric character',
      }
    );
    basicValidations.jobId.message = msg;
  }

  if (validationResults.contains('job_group_id_invalid')) {
    basicValidations.groupIds.valid = false;
    const msg = i18n.translate(
      'xpack.ml.newJob.simple.validateJob.jobGroupAllowedCharactersDescription',
      {
        defaultMessage:
          'Job group names can contain lowercase alphanumeric (a-z and 0-9), hyphens or underscores; ' +
          'must start and end with an alphanumeric character',
      }
    );
    basicValidations.groupIds.message = msg;
  }

  if (validationResults.contains('model_memory_limit_units_invalid')) {
    basicValidations.modelMemoryLimit.valid = false;
    const str = `${ALLOWED_DATA_UNITS.slice(0, ALLOWED_DATA_UNITS.length - 1).join(', ')} or ${[
      ...ALLOWED_DATA_UNITS,
    ].pop()}`;
    const msg = i18n.translate(
      'xpack.ml.newJob.simple.validateJob.modelMemoryLimitUnitsInvalidErrorMessage',
      {
        defaultMessage: 'Model memory limit data unit unrecognized. It must be {str}',
        values: { str },
      }
    );
    basicValidations.modelMemoryLimit.message = msg;
  }

  if (validationResults.contains('model_memory_limit_invalid')) {
    basicValidations.modelMemoryLimit.valid = false;
    const msg = i18n.translate(
      'xpack.ml.newJob.simple.validateJob.modelMemoryLimitRangeInvalidErrorMessage',
      {
        defaultMessage:
          'Model memory limit cannot be higher than the maximum value of {maxModelMemoryLimit}',
        values: { maxModelMemoryLimit: limits.max_model_memory_limit.toUpperCase() },
      }
    );
    basicValidations.modelMemoryLimit.message = msg;
  }

  if (validationResults.contains('detectors_duplicates')) {
    basicValidations.duplicateDetectors.valid = false;
    const msg = i18n.translate(
      'xpack.ml.newJob.simple.validateJob.duplicatedDetectorsErrorMessage',
      {
        defaultMessage: 'Duplicate detectors were found.',
      }
    );
    basicValidations.duplicateDetectors.message = msg;
  }

  if (validationResults.contains('bucket_span_empty')) {
    basicValidations.bucketSpan.valid = false;
    const msg = i18n.translate(
      'xpack.ml.newJob.simple.validateJob.bucketSpanMustBeSetErrorMessage',
      {
        defaultMessage: '{bucketSpan} must be set',
        values: { bucketSpan: 'bucket_span' },
      }
    );

    basicValidations.bucketSpan.message = msg;
  } else if (validationResults.contains('bucket_span_invalid')) {
    basicValidations.bucketSpan.valid = false;
    const msg = i18n.translate(
      'xpack.ml.newJob.advanced.validateJob.bucketSpanInvalidTimeIntervalFormatErrorMessage',
      {
        defaultMessage:
          '{bucketSpan} is not a valid time interval format e.g. {tenMinutes}, {oneHour}. It also needs to be higher than zero.',
        values: {
          bucketSpan: jobConfig.analysis_config.bucket_span,
          tenMinutes: '10m',
          oneHour: '1h',
        },
      }
    );

    basicValidations.bucketSpan.message = msg;
  }
}
