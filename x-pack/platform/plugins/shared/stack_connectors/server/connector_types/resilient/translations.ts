/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const NAME = i18n.translate('xpack.stackConnectors.resilient.title', {
  defaultMessage: 'IBM Resilient',
});

export const ALLOWED_HOSTS_ERROR = (message: string) =>
  i18n.translate('xpack.stackConnectors.resilient.configuration.apiAllowedHostsError', {
    defaultMessage: 'error configuring connector action: {message}',
    values: {
      message,
    },
  });

export const UNKNOWN_API_ERROR = i18n.translate('xpack.stackConnectors.resilient.unknownError', {
  defaultMessage: 'Unknown API Error',
});

export const UNAUTHORIZED_API_ERROR = i18n.translate(
  'xpack.stackConnectors.resilient.unauthorizedError',
  {
    defaultMessage: 'Unauthorized API Error',
  }
);
