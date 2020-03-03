/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { forbidden } from 'boom';
import { i18n } from '@kbn/i18n';

const getStatusCode = err => {
  return err.isBoom ? err.output.statusCode : err.statusCode;
};

export function isAuthError(err) {
  const statusCode = getStatusCode(err);
  return statusCode === 401 || statusCode === 403;
}

export function handleAuthError(err) {
  const statusCode = getStatusCode(err);

  let message;
  /* 401 is changed to 403 because in user perception, they HAVE provided
   * credentials for the API.
   * They should see the same message whether they're logged in but
   * insufficient permissions, or they're login is valid for the production
   * connection but not the monitoring connection
   */
  if (statusCode === 401) {
    message = i18n.translate('xpack.monitoring.errors.invalidAuthErrorMessage', {
      defaultMessage: 'Invalid authentication for monitoring cluster',
    });
  } else {
    message = i18n.translate('xpack.monitoring.errors.insufficientUserErrorMessage', {
      defaultMessage: 'Insufficient user permissions for monitoring data',
    });
  }

  return forbidden(message);
}
