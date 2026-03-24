/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const AUTHENTICATION_TITLE = i18n.translate(
  'xpack.stackConnectors.components.auth.authenticationTitle',
  {
    defaultMessage: 'Authentication',
  }
);

export const AUTHENTICATION_NONE = i18n.translate(
  'xpack.stackConnectors.components.auth.authenticationMethodNoneLabel',
  {
    defaultMessage: 'None',
  }
);

export const AUTHENTICATION_BASIC = i18n.translate(
  'xpack.stackConnectors.components.auth.authenticationMethodBasicLabel',
  {
    defaultMessage: 'Basic authentication',
  }
);

export const AUTHENTICATION_SSL = i18n.translate(
  'xpack.stackConnectors.components.auth.authenticationMethodSSLLabel',
  {
    defaultMessage: 'SSL authentication',
  }
);

export const USERNAME = i18n.translate('xpack.stackConnectors.components.auth.userTextFieldLabel', {
  defaultMessage: 'Username',
});

export const PASSWORD = i18n.translate(
  'xpack.stackConnectors.components.auth.passwordTextFieldLabel',
  {
    defaultMessage: 'Password',
  }
);

export const USERNAME_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.auth.error.requiredAuthUserNameText',
  {
    defaultMessage: 'Username is required.',
  }
);

export const PASSWORD_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.auth.error.requiredAuthPasswordText',
  {
    defaultMessage: 'Password is required.',
  }
);

export const CERT_TYPE_CRT_KEY = i18n.translate(
  'xpack.stackConnectors.components.auth.certTypeCrtKeyLabel',
  {
    defaultMessage: 'CRT and KEY file',
  }
);
export const CERT_TYPE_PFX = i18n.translate(
  'xpack.stackConnectors.components.auth.certTypePfxLabel',
  {
    defaultMessage: 'PFX file',
  }
);

export const CRT_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.auth.error.requiredCRTText',
  {
    defaultMessage: 'CRT file is required.',
  }
);

export const KEY_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.auth.error.requiredKEYText',
  {
    defaultMessage: 'KEY file is required.',
  }
);

export const PFX_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.auth.error.requiredPFXText',
  {
    defaultMessage: 'PFX file is required.',
  }
);

export const HEADERS_SWITCH = i18n.translate(
  'xpack.stackConnectors.components.auth.viewHeadersSwitch',
  {
    defaultMessage: 'Add HTTP header',
  }
);

export const HEADERS_TITLE = i18n.translate(
  'xpack.stackConnectors.components.auth.httpHeadersTitle',
  {
    defaultMessage: 'HTTP headers',
  }
);

export const HEADERS_SUBTITLE = i18n.translate(
  'xpack.stackConnectors.components.auth.httpHeadersSubtitle',
  {
    defaultMessage: 'Add custom HTTP headers to be sent with API requests',
  }
);

export const MAX_HEADERS_LIMIT = (maxHeaders: number) =>
  i18n.translate('xpack.stackConnectors.components.auth.maxHeaders', {
    values: { maxHeaders },
    defaultMessage: 'Maximum number of {maxHeaders} headers reached.',
  });

export const KEY_LABEL = i18n.translate('xpack.stackConnectors.components.auth.keyTextFieldLabel', {
  defaultMessage: 'Key',
});

export const ENCRYPTED_HEADERS_BADGE = i18n.translate(
  'xpack.stackConnectors.components.auth.encryptedHeadersBadge',
  {
    defaultMessage: 'Encrypted Headers',
  }
);

export const ENCRYPTED_HEADERS_TOOLTIP_CONTENT = i18n.translate(
  'xpack.stackConnectors.components.auth.encryptedHeadersTooltipContent',
  {
    defaultMessage:
      'Values of the secret headers are encrypted. You must re-enter them when editing the connector',
  }
);

export const SAME_HEADER_KEY_ERROR = i18n.translate(
  'xpack.stackConnectors.components.auth.sameHeaderKeyError',
  {
    defaultMessage: 'This key is already used in another header',
  }
);

export const VALUE_LABEL = i18n.translate(
  'xpack.stackConnectors.components.auth.valueTextFieldLabel',
  {
    defaultMessage: 'Value',
  }
);

export const CONFIG_OPTION = i18n.translate(
  'xpack.stackConnectors.components.auth.configHeaderLabel',
  {
    defaultMessage: 'Config',
  }
);

export const HEADER_TYPE_LABEL = i18n.translate(
  'xpack.stackConnectors.components.auth.headerTypeLabel',
  {
    defaultMessage: 'Type',
  }
);

export const SECRET_OPTION = i18n.translate(
  'xpack.stackConnectors.components.auth.secretHeaderLabel',
  {
    defaultMessage: 'Secret',
  }
);

export const HEADER_MISSING_VALUE_ERROR = i18n.translate(
  'xpack.stackConnectors.components.auth.secretHeaderMissingValueError',
  {
    defaultMessage: 'Value is required',
  }
);

export const HEADER_MISSING_KEY_ERROR = i18n.translate(
  'xpack.stackConnectors.components.auth.secretHeaderMissingValueError',
  {
    defaultMessage: 'Key is required',
  }
);

export const ADD_BUTTON = i18n.translate('xpack.stackConnectors.components.auth.addHeaderButton', {
  defaultMessage: 'Add header',
});

export const DELETE_BUTTON = i18n.translate(
  'xpack.stackConnectors.components.auth.deleteHeaderButton',
  {
    defaultMessage: 'Delete',
    description: 'Delete HTTP header',
  }
);

export const CA_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.auth.error.requiredCAText',
  {
    defaultMessage: 'CA file is required.',
  }
);

export const ADD_CA_LABEL = i18n.translate(
  'xpack.stackConnectors.components.auth.viewCertificateAuthoritySwitch',
  {
    defaultMessage: 'Add certificate authority',
  }
);

export const VERIFICATION_MODE_LABEL = i18n.translate(
  'xpack.stackConnectors.components.auth.verificationModeFieldLabel',
  { defaultMessage: 'Verification mode' }
);

export const EDIT_CA_CALLOUT = i18n.translate(
  'xpack.stackConnectors.components.auth.editCACallout',
  {
    defaultMessage:
      'This connector has an existing certificate authority file. Upload a new one to replace it.',
  }
);

export const ACCESS_TOKEN_URL = i18n.translate(
  'xpack.stackConnectors.components.auth.accessTokenUrlTextFieldLabel',
  {
    defaultMessage: 'Access token URL',
    description: 'The URL to get the access token from',
  }
);
export const ACCESS_TOKEN_URL_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.auth.error.requiredAccessTokenUrlText',
  {
    defaultMessage: 'Access token URL is required.',
  }
);
export const CLIENT_ID = i18n.translate(
  'xpack.stackConnectors.components.auth.clientIdTextFieldLabel',
  {
    defaultMessage: 'Client ID',
    description: 'The client ID to use for OAuth2 authentication',
  }
);
export const CLIENT_ID_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.auth.error.requiredClientIdText',
  {
    defaultMessage: 'Client ID is required.',
  }
);
export const CLIENT_SECRET = i18n.translate(
  'xpack.stackConnectors.components.auth.clientSecretTextFieldLabel',
  {
    defaultMessage: 'Client secret',
    description: 'The client secret to use for for OAuth2 authentication',
  }
);
export const CLIENT_SECRET_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.auth.error.requiredClientSecretText',
  {
    defaultMessage: 'Client secret is required.',
  }
);
export const SCOPE = i18n.translate(
  'xpack.stackConnectors.components.auth.clientSecretTextFieldLabel',
  {
    defaultMessage: 'Scope',
    description: 'The scope to use for for OAuth2 authentication',
  }
);

export const SCOPE_HELP_TEXT = i18n.translate(
  'xpack.stackConnectors.components.auth.scopeHelpText',
  {
    defaultMessage: "Space-separated list of scopes (e.g., 'email profile').",
  }
);

export const AUTHENTICATION_OAUTH2 = i18n.translate(
  'xpack.stackConnectors.components.auth.authenticationMethodOAuth2Label',
  {
    defaultMessage: 'OAuth 2.0 Client Credentials',
  }
);

export const INVALID_JSON = i18n.translate(
  'xpack.stackConnectors.components.additionalFieldsFormatErrorMessage',
  {
    defaultMessage: 'Invalid JSON',
  }
);

export const INVALID_INPUT_EMPTY = i18n.translate(
  'xpack.stackConnectors.components.additionalFieldsEmptyErrorMessage',
  {
    defaultMessage: 'Invalid JSON, cannot be empty',
  }
);

export const INVALID_INPUT_ARRAY = i18n.translate(
  'xpack.stackConnectors.components.additionalFieldsArrayErrorMessage',
  {
    defaultMessage: 'Invalid JSON, cannot be an array',
  }
);

export const ADDITIONAL_FIELDS = i18n.translate(
  'xpack.stackConnectors.components.additionalFieldsTitle',
  {
    defaultMessage: 'Additional fields',
    description: 'Title for the additional fields section',
  }
);

export const ADDITIONAL_FIELDS_HELP_WEBHOOK_TEXT = i18n.translate(
  'xpack.stackConnectors.components.webhhok.additionalFieldsHelpTooltipText',
  {
    defaultMessage:
      'Additional fields in JSON format. Your token provider may require more that just the default fields.',
  }
);

export const OPTIONAL_LABEL = i18n.translate(
  'xpack.stackConnectors.components.auth.optionalLabel',
  {
    defaultMessage: 'Optional',
  }
);
