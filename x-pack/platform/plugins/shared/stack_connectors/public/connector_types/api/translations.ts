/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const BASE_PATH_LABEL = i18n.translate(
  'xpack.stackConnectors.components.api.basePathTextFieldLabel',
  {
    defaultMessage: 'Base API URL',
  }
);

export const BASE_PATH_INVALID = i18n.translate(
  'xpack.stackConnectors.components.api.error.invalidBasePathTextField',
  {
    defaultMessage: 'Base API URL is invalid.',
  }
);

export const BASE_PATH_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.api.error.requiredBasePathText',
  {
    defaultMessage: 'Base API URL is required.',
  }
);
