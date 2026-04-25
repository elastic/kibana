/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ADDITIONAL_FIELD_CONFIG_ERROR = i18n.translate(
  'xpack.stackConnectors.webhook.additionalFieldsConfigurationError',
  {
    defaultMessage:
      'error validation webhook action config: additionalFields must be a non-empty JSON object.',
  }
);
