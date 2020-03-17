/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const SERVICENOW_DESC = i18n.translate(
  'xpack.siem.case.connectors.servicenow.selectMessageText',
  {
    defaultMessage: 'Push or update SIEM case data to a new incident in ServiceNow',
  }
);

export const SERVICENOW_TITLE = i18n.translate(
  'xpack.siem.case.connectors.servicenow.actionTypeTitle',
  {
    defaultMessage: 'ServiceNow',
  }
);

export const SERVICENOW_API_URL_LABEL = i18n.translate(
  'xpack.siem.case.connectors.servicenow.apiUrlTextFieldLabel',
  {
    defaultMessage: 'URL',
  }
);

export const SERVICENOW_API_URL_REQUIRED = i18n.translate(
  'xpack.siem.case.connectors.servicenow.requiredApiUrlTextField',
  {
    defaultMessage: 'URL is required',
  }
);

export const SERVICENOW_API_URL_INVALID = i18n.translate(
  'xpack.siem.case.connectors.servicenow.invalidApiUrlTextField',
  {
    defaultMessage: 'URL is invalid',
  }
);

export const SERVICENOW_USERNAME_LABEL = i18n.translate(
  'xpack.siem.case.connectors.servicenow.usernameTextFieldLabel',
  {
    defaultMessage: 'Username',
  }
);

export const SERVICENOW_USERNAME_REQUIRED = i18n.translate(
  'xpack.siem.case.connectors.servicenow.requiredUsernameTextField',
  {
    defaultMessage: 'Username is required',
  }
);

export const SERVICENOW_PASSWORD_LABEL = i18n.translate(
  'xpack.siem.case.connectors.servicenow.passwordTextFieldLabel',
  {
    defaultMessage: 'Password',
  }
);

export const SERVICENOW_PASSWORD_REQUIRED = i18n.translate(
  'xpack.siem.case.connectors.servicenow.requiredPasswordTextField',
  {
    defaultMessage: 'Password is required',
  }
);
