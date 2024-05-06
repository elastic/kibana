/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const METHOD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.webhook.methodTextFieldLabel',
  {
    defaultMessage: 'Method',
  }
);

export const HAS_AUTH_LABEL = i18n.translate(
  'xpack.stackConnectors.components.webhook.hasAuthSwitchLabel',
  {
    defaultMessage: 'Require authentication for this webhook',
  }
);

export const URL_LABEL = i18n.translate(
  'xpack.stackConnectors.components.webhook.urlTextFieldLabel',
  {
    defaultMessage: 'URL',
  }
);

export const USERNAME_LABEL = i18n.translate(
  'xpack.stackConnectors.components.webhook.userTextFieldLabel',
  {
    defaultMessage: 'Username',
  }
);

export const PASSWORD_LABEL = i18n.translate(
  'xpack.stackConnectors.components.webhook.passwordTextFieldLabel',
  {
    defaultMessage: 'Password',
  }
);

export const PASSPHRASE_LABEL = i18n.translate(
  'xpack.stackConnectors.components.webhook.passphraseTextFieldLabel',
  {
    defaultMessage: 'Passphrase',
  }
);

export const ADD_HEADERS_LABEL = i18n.translate(
  'xpack.stackConnectors.components.webhook.viewHeadersSwitch',
  {
    defaultMessage: 'Add HTTP header',
  }
);

export const HEADER_KEY_LABEL = i18n.translate(
  'xpack.stackConnectors.components.webhook.headerKeyTextFieldLabel',
  {
    defaultMessage: 'Key',
  }
);

export const REMOVE_ITEM_LABEL = i18n.translate(
  'xpack.stackConnectors.components.webhook.removeHeaderIconLabel',
  {
    defaultMessage: 'Key',
  }
);

export const ADD_HEADER_BTN = i18n.translate(
  'xpack.stackConnectors.components.webhook.addHeaderButtonLabel',
  {
    defaultMessage: 'Add header',
  }
);

export const HEADER_VALUE_LABEL = i18n.translate(
  'xpack.stackConnectors.components.webhook.headerValueTextFieldLabel',
  {
    defaultMessage: 'Value',
  }
);

export const URL_INVALID = i18n.translate(
  'xpack.stackConnectors.components.webhook.error.invalidUrlTextField',
  {
    defaultMessage: 'URL is invalid.',
  }
);

export const METHOD_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.webhook.error.requiredMethodText',
  {
    defaultMessage: 'Method is required.',
  }
);

export const USERNAME_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.webhook.error.requiredAuthUserNameText',
  {
    defaultMessage: 'Username is required.',
  }
);

export const BODY_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.webhook.error.requiredWebhookBodyText',
  {
    defaultMessage: 'Body is required.',
  }
);

export const PASSWORD_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.webhook.error.requiredWebhookPasswordText',
  {
    defaultMessage: 'Password is required.',
  }
);

export const AUTHENTICATION_NONE = i18n.translate(
  'xpack.stackConnectors.components.webhook.authenticationMethodNoneLabel',
  {
    defaultMessage: 'None',
  }
);

export const AUTHENTICATION_BASIC = i18n.translate(
  'xpack.stackConnectors.components.webhook.authenticationMethodBasicLabel',
  {
    defaultMessage: 'Basic authentication',
  }
);

export const AUTHENTICATION_SSL = i18n.translate(
  'xpack.stackConnectors.components.webhook.authenticationMethodSSLLabel',
  {
    defaultMessage: 'SSL authentication',
  }
);

export const CERT_TYPE_CRT_KEY = i18n.translate(
  'xpack.stackConnectors.components.webhook.certTypeCrtKeyLabel',
  {
    defaultMessage: 'CRT and KEY file',
  }
);
export const CERT_TYPE_PFX = i18n.translate(
  'xpack.stackConnectors.components.webhook.certTypePfxLabel',
  {
    defaultMessage: 'PFX file',
  }
);

export const CRT_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.webhook.error.requiredWebhookCRTText',
  {
    defaultMessage: 'CRT file is required.',
  }
);

export const KEY_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.webhook.error.requiredWebhookKEYText',
  {
    defaultMessage: 'KEY file is required.',
  }
);

export const PFX_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.webhook.error.requiredWebhookPFXText',
  {
    defaultMessage: 'PFX file is required.',
  }
);

export const CA_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.webhook.error.requiredWebhookCAText',
  {
    defaultMessage: 'CA file is required.',
  }
);

export const ADD_CA_LABEL = i18n.translate(
  'xpack.stackConnectors.components.webhook.viewCertificateAuthoritySwitch',
  {
    defaultMessage: 'Add certificate authority',
  }
);

export const VERIFICATION_MODE_LABEL = i18n.translate(
  'xpack.stackConnectors.components.webhook.verificationModeFieldLabel',
  { defaultMessage: 'Verification mode' }
);

export const EDIT_CA_CALLOUT = i18n.translate(
  'xpack.stackConnectors.components.webhook.editCACallout',
  {
    defaultMessage:
      'This webhook has an existing certificate authority file. Upload a new one to replace it.',
  }
);
