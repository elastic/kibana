/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const BASE_URL_LABEL = i18n.translate(
  'xpack.stackConnectors.components.http.baseUrlTextFieldLabel',
  { defaultMessage: 'Base URL' }
);

export const BASE_URL_INVALID = i18n.translate(
  'xpack.stackConnectors.components.http.error.invalidBaseUrlTextField',
  { defaultMessage: 'Base URL is invalid.' }
);

export const BASE_URL_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.http.error.requiredBaseUrlText',
  { defaultMessage: 'Base URL is required.' }
);

export const PATH_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.http.pathFieldLabel',
  { defaultMessage: 'Path' }
);

export const METHOD_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.http.methodFieldLabel',
  { defaultMessage: 'Method' }
);

export const BODY_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.http.bodyFieldLabel',
  { defaultMessage: 'Body' }
);

export const QUERY_PARAMS_TITLE = i18n.translate(
  'xpack.stackConnectors.components.http.queryParamsTitle',
  { defaultMessage: 'Query Parameters' }
);

export const HEADERS_TITLE = i18n.translate('xpack.stackConnectors.components.http.headersTitle', {
  defaultMessage: 'Headers',
});

export const TIMEOUT_FIELD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.http.timeoutFieldLabel',
  { defaultMessage: 'Timeout (seconds)' }
);

export const PROXY_URL_LABEL = i18n.translate(
  'xpack.stackConnectors.components.http.proxyUrlTextFieldLabel',
  { defaultMessage: 'Proxy URL' }
);

export const PROXY_URL_INVALID = i18n.translate(
  'xpack.stackConnectors.components.http.error.invalidProxyUrlTextField',
  { defaultMessage: 'Proxy URL is invalid.' }
);

export const PROXY_VERIFICATION_MODE_LABEL = i18n.translate(
  'xpack.stackConnectors.components.http.proxyVerificationModeLabel',
  { defaultMessage: 'Proxy TLS verification' }
);

export const PROXY_AUTH_LABEL = i18n.translate(
  'xpack.stackConnectors.components.http.proxyAuthLabel',
  { defaultMessage: 'Proxy authentication' }
);

export const PROXY_USERNAME_LABEL = i18n.translate(
  'xpack.stackConnectors.components.http.proxyUsernameLabel',
  { defaultMessage: 'Username' }
);

export const PROXY_USERNAME_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.http.error.requiredProxyUsernameText',
  { defaultMessage: 'Username is required.' }
);

export const PROXY_PASSWORD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.http.proxyPasswordLabel',
  { defaultMessage: 'Password' }
);

export const PROXY_PASSWORD_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.http.error.requiredProxyPasswordText',
  { defaultMessage: 'Password is required.' }
);

export const PROXY_SWITCH_LABEL = i18n.translate(
  'xpack.stackConnectors.components.http.proxySwitchLabel',
  { defaultMessage: 'Proxy' }
);

export const PROXY_URL_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.http.error.requiredProxyUrlText',
  { defaultMessage: 'Proxy URL is required.' }
);

export const PROXY_AUTH_NONE = i18n.translate(
  'xpack.stackConnectors.components.http.proxyAuthNoneLabel',
  { defaultMessage: 'None' }
);

export const PROXY_AUTH_BASIC = i18n.translate(
  'xpack.stackConnectors.components.http.proxyAuthBasicLabel',
  { defaultMessage: 'Basic authentication' }
);

export const PROXY_OVERRIDE_CALLOUT = i18n.translate(
  'xpack.stackConnectors.components.http.proxyOverrideCallout',
  {
    defaultMessage:
      'These settings override any global proxy settings defined in your Kibana configuration, for requests made by this connector.',
  }
);

export const PROXY_VERIFICATION_MODE_NONE = i18n.translate(
  'xpack.stackConnectors.components.http.proxyVerificationModeNoneLabel',
  { defaultMessage: 'None' }
);

export const PROXY_VERIFICATION_MODE_CERTIFICATE = i18n.translate(
  'xpack.stackConnectors.components.http.proxyVerificationModeCertificateLabel',
  { defaultMessage: 'Certificate' }
);

export const PROXY_VERIFICATION_MODE_FULL = i18n.translate(
  'xpack.stackConnectors.components.http.proxyVerificationModeFullLabel',
  { defaultMessage: 'Full' }
);
