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
    defaultMessage: 'Headers in use',
  }
);

export const KEY_LABEL = i18n.translate('xpack.stackConnectors.components.auth.keyTextFieldLabel', {
  defaultMessage: 'Key',
});

export const VALUE_LABEL = i18n.translate(
  'xpack.stackConnectors.components.auth.valueTextFieldLabel',
  {
    defaultMessage: 'Value',
  }
);

export const ADD_BUTTON = i18n.translate('xpack.stackConnectors.components.auth.addHeaderButton', {
  defaultMessage: 'Add',
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
