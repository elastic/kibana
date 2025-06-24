/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SERVICENOW = i18n.translate('xpack.stackConnectors.serviceNow.title', {
  defaultMessage: 'ServiceNow',
});

export const SERVICENOW_ITSM = i18n.translate('xpack.stackConnectors.serviceNowITSM.title', {
  defaultMessage: 'ServiceNow ITSM',
});

export const SERVICENOW_SIR = i18n.translate('xpack.stackConnectors.serviceNowSIR.title', {
  defaultMessage: 'ServiceNow SecOps',
});

export const SERVICENOW_ITOM = i18n.translate('xpack.stackConnectors.serviceNowITOM.title', {
  defaultMessage: 'ServiceNow ITOM',
});

export const ALLOWED_HOSTS_ERROR = (message: string) =>
  i18n.translate('xpack.stackConnectors.serviceNow.configuration.apiAllowedHostsError', {
    defaultMessage: 'error configuring connector action: {message}',
    values: {
      message,
    },
  });

export const CREDENTIALS_ERROR = i18n.translate(
  'xpack.stackConnectors.serviceNow.configuration.apiCredentialsError',
  {
    defaultMessage: 'Either basic auth or OAuth credentials must be specified',
  }
);

export const BASIC_AUTH_CREDENTIALS_ERROR = i18n.translate(
  'xpack.stackConnectors.serviceNow.configuration.apiBasicAuthCredentialsError',
  {
    defaultMessage: 'username and password must both be specified',
  }
);

export const OAUTH_CREDENTIALS_ERROR = i18n.translate(
  'xpack.stackConnectors.serviceNow.configuration.apiOAuthCredentialsError',
  {
    defaultMessage: 'clientSecret and privateKey must both be specified',
  }
);

export const VALIDATE_OAUTH_MISSING_FIELD_ERROR = (field: string, isOAuth: boolean) =>
  i18n.translate(
    'xpack.stackConnectors.serviceNow.configuration.apiValidateMissingOAuthFieldError',
    {
      defaultMessage: '{field} must be provided when isOAuth = {isOAuth}',
      values: {
        field,
        isOAuth: isOAuth ? 'true' : 'false',
      },
    }
  );

export const VALIDATE_OAUTH_POPULATED_FIELD_ERROR = (field: string, isOAuth: boolean) =>
  i18n.translate('xpack.stackConnectors.serviceNow.configuration.apiValidateOAuthFieldError', {
    defaultMessage: '{field} should not be provided with isOAuth = {isOAuth}',
    values: {
      field,
      isOAuth: isOAuth ? 'true' : 'false',
    },
  });
