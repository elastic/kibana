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

export const URL_LABEL = i18n.translate(
  'xpack.stackConnectors.components.webhook.urlTextFieldLabel',
  {
    defaultMessage: 'URL',
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

export const BODY_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.webhook.error.requiredWebhookBodyText',
  {
    defaultMessage: 'Body is required.',
  }
);
