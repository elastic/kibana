/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { boomify } from 'boom';
import { i18n } from '@kbn/i18n';
import { MonitoringLicenseError } from './custom_errors';

/*
 * Check if the given error message is a known "safe" type of error
 * in which case we want to give the status as 503 and show the error message.
 *
 * This is necessary because Boom's default status code is 500, and has
 * behavior to suppress the original message to the client for security
 * reasons.
 */
const KNOWN_ERROR_STATUS_CODE = 503;

const mapTypeMessage = {
  ConnectionFault: i18n.translate('xpack.monitoring.errors.connectionFaultErrorMessage', {
    defaultMessage:
      'Check the Elasticsearch Monitoring cluster network connection and refer to the Kibana logs for more information.',
  }),
  NoConnections: i18n.translate('xpack.monitoring.errors.noConnectionsErrorMessage', {
    defaultMessage:
      'Check the Elasticsearch Monitoring cluster network connection and refer to the Kibana logs for more information.',
  }),
  StatusCodeError: i18n.translate('xpack.monitoring.errors.statusCodeErrorMessage', {
    defaultMessage:
      'Check the Elasticsearch Monitoring cluster network connection or the load level of the nodes.',
  }),
};

const customErrors = [MonitoringLicenseError];

export function isKnownError(err) {
  for (const customError of customErrors) {
    if (err instanceof customError) {
      return true;
    }
  }
  const knownTypes = Object.keys(mapTypeMessage);
  return knownTypes.includes(err.constructor.name);
}

export function handleKnownError(err) {
  err.message = err.message + ': ' + (err.description || mapTypeMessage[err.constructor.name]);
  return boomify(err, { statusCode: KNOWN_ERROR_STATUS_CODE });
}
