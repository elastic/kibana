/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const URL_LABEL = i18n.translate('xpack.stackConnectors.torqAction.urlTextFieldLabel', {
  defaultMessage: 'Torq endpoint URL',
});

export const URL_INVALID = i18n.translate(
  'xpack.stackConnectors.torqAction.error.invalidUrlTextField',
  {
    defaultMessage: 'URL is invalid.',
  }
);

export const BODY_FIELD_LABEL = i18n.translate('xpack.stackConnectors.torqAction.bodyFieldLabel', {
  defaultMessage: 'Body',
});

export const BODY_FIELD_ARIA_LABEL = i18n.translate(
  'xpack.stackConnectors.torqAction.bodyCodeEditorAriaLabel',
  {
    defaultMessage: 'Code editor',
  }
);

export const URL_NOT_TORQ_WEBHOOK = i18n.translate(
  'xpack.stackConnectors.torqAction.error.urlIsNotTorqWebhook',
  {
    defaultMessage: 'URL is not a Torq integration endpoint.',
  }
);

export const TORQ_TOKEN_LABEL = i18n.translate('xpack.stackConnectors.torqAction.token', {
  defaultMessage: 'Torq integration token',
});

export const TORQ_TOKEN_REQUIRED = i18n.translate(
  'xpack.stackConnectors.error.requiredWebhookTorqTokenText',
  {
    defaultMessage: 'Torq integration token is required.',
  }
);

export const BODY_REQUIRED = i18n.translate('xpack.stackConnectors.error.requiredWebhookBodyText', {
  defaultMessage: 'Body is required.',
});

export const INVALID_JSON = i18n.translate('xpack.stackConnectors.error.requireValidJSONBody', {
  defaultMessage: 'Body must be a valid JSON.',
});

export const TORQ_SELECT_MESSAGE = i18n.translate(
  'xpack.stackConnectors.torqAction.selectMessageText',
  {
    defaultMessage: 'Trigger a Torq workflow.',
  }
);

export const TORQ_ACTION_TYPE_TITLE = i18n.translate(
  'xpack.stackConnectors.torqAction.actionTypeTitle',
  {
    defaultMessage: 'Alert data',
  }
);

export const TORQ_TOKEN_HELP_TEXT = i18n.translate(
  'xpack.stackConnectors.torqAction.tokenHelpText',
  {
    defaultMessage:
      'Enter the webhook authentication header secret generated when you created the Elastic Security integration.',
  }
);

export const URL_HELP_TEXT = i18n.translate('xpack.stackConnectors.torqAction.urlHelpText', {
  defaultMessage:
    'Enter the endpoint URL generated when you created the Elastic Security integration on Torq.',
});

export const HOW_TO_TEXT = i18n.translate(
  'xpack.stackConnectors.torqActionConnectorFields.calloutTitle',
  {
    defaultMessage:
      'Create an Elastic Security integration on Torq, and then come back and paste the endpoint URL and token generated for your integration.',
  }
);
