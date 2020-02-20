/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import Boom from 'boom';

import { fieldsServiceProvider } from '../fields_service';
import { renderTemplate } from '../../../common/util/string_utils';
import { getMessages } from './messages';
import { VALIDATION_STATUS } from '../../../common/constants/validation';

import { basicJobValidation, uniqWithIsEqual } from '../../../common/util/job_utils';
import { validateBucketSpan } from './validate_bucket_span';
import { validateCardinality } from './validate_cardinality';
import { validateInfluencers } from './validate_influencers';
import { validateModelMemoryLimit } from './validate_model_memory_limit';
import { validateTimeRange, isValidTimeField } from './validate_time_range';

export async function validateJob(
  callWithRequest,
  payload,
  kbnVersion = 'current',
  callAsInternalUser,
  xpackMainPlugin
) {
  const messages = getMessages();

  try {
    if (typeof payload !== 'object' || payload === null) {
      throw new Error(
        i18n.translate('xpack.ml.models.jobValidation.payloadIsNotObjectErrorMessage', {
          defaultMessage: 'Invalid {invalidParamName}: Needs to be an object.',
          values: { invalidParamName: 'payload' },
        })
      );
    }

    const { fields, job } = payload;
    let { duration } = payload;

    if (typeof job !== 'object') {
      throw new Error(
        i18n.translate('xpack.ml.models.jobValidation.jobIsNotObjectErrorMessage', {
          defaultMessage: 'Invalid {invalidParamName}: Needs to be an object.',
          values: { invalidParamName: 'job' },
        })
      );
    }

    if (typeof job.analysis_config !== 'object') {
      throw new Error(
        i18n.translate('xpack.ml.models.jobValidation.analysisConfigIsNotObjectErrorMessage', {
          defaultMessage: 'Invalid {invalidParamName}: Needs to be an object.',
          values: { invalidParamName: 'job.analysis_config' },
        })
      );
    }

    if (!Array.isArray(job.analysis_config.detectors)) {
      throw new Error(
        i18n.translate('xpack.ml.models.jobValidation.detectorsAreNotArrayErrorMessage', {
          defaultMessage: 'Invalid {invalidParamName}: Needs to be an array.',
          values: { invalidParamName: 'job.analysis_config.detectors' },
        })
      );
    }

    // check if basic tests pass the requirements to run the extended tests.
    // if so, run the extended tests and merge the messages.
    // otherwise just return the basic test messages.
    const basicValidation = basicJobValidation(job, fields, {}, true);
    let validationMessages;

    if (basicValidation.valid === true) {
      // remove basic success messages from tests
      // where we run additional extended tests.
      const filteredBasicValidationMessages = basicValidation.messages.filter(m => {
        return m.id !== 'bucket_span_valid';
      });

      // if no duration was part of the request, fall back to finding out
      // the time range of the time field of the index, but also check first
      // if the time field is a valid field of type 'date' using isValidTimeField()
      if (typeof duration === 'undefined' && (await isValidTimeField(callWithRequest, job))) {
        const fs = fieldsServiceProvider(callWithRequest);
        const index = job.datafeed_config.indices.join(',');
        const timeField = job.data_description.time_field;
        const timeRange = await fs.getTimeFieldRange(index, timeField, job.datafeed_config.query);

        duration = {
          start: timeRange.start.epoch,
          end: timeRange.end.epoch,
        };
      }

      validationMessages = filteredBasicValidationMessages;

      // next run only the cardinality tests to find out if they trigger an error
      // so we can decide later whether certain additional tests should be run
      const cardinalityMessages = await validateCardinality(callWithRequest, job);
      validationMessages.push(...cardinalityMessages);
      const cardinalityError = cardinalityMessages.some(m => {
        return VALIDATION_STATUS[messages[m.id].status] === VALIDATION_STATUS.ERROR;
      });

      validationMessages.push(
        ...(await validateBucketSpan(
          callWithRequest,
          job,
          duration,
          callAsInternalUser,
          xpackMainPlugin
        ))
      );
      validationMessages.push(...(await validateTimeRange(callWithRequest, job, duration)));

      // only run the influencer and model memory limit checks
      // if cardinality checks didn't return a message with an error level
      if (cardinalityError === false) {
        validationMessages.push(...(await validateInfluencers(callWithRequest, job)));
        validationMessages.push(
          ...(await validateModelMemoryLimit(callWithRequest, job, duration))
        );
      }
    } else {
      validationMessages = basicValidation.messages;
      validationMessages.push({ id: 'skipped_extended_tests' });
    }

    return uniqWithIsEqual(validationMessages).map(message => {
      if (typeof messages[message.id] !== 'undefined') {
        // render the message template with the provided metadata
        if (typeof messages[message.id].heading !== 'undefined') {
          message.heading = renderTemplate(messages[message.id].heading, message);
        }
        message.text = renderTemplate(messages[message.id].text, message);
        // check if the error message provides a link with further information
        // if so, add it to the message to be returned with it
        if (typeof messages[message.id].url !== 'undefined') {
          // the link is also treated as a template so we're able to dynamically link to
          // documentation links matching the running version of Kibana.
          message.url = renderTemplate(messages[message.id].url, { version: kbnVersion });
        }

        message.status = VALIDATION_STATUS[messages[message.id].status];
      } else {
        message.text = i18n.translate(
          'xpack.ml.models.jobValidation.unknownMessageIdErrorMessage',
          {
            defaultMessage: '{messageId} (unknown message id)',
            values: { messageId: message.id },
          }
        );
      }

      return message;
    });
  } catch (error) {
    throw Boom.badRequest(error);
  }
}
