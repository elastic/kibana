/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TITLE = i18n.translate('xpack.automaticImport.steps.connector.title', {
  defaultMessage: 'Choose your AI connector',
});

export const DESCRIPTION = i18n.translate('xpack.automaticImport.steps.connector.description', {
  defaultMessage: 'Select an AI connector to help you create your custom integration',
});

export const CREATE_CONNECTOR = i18n.translate(
  'xpack.automaticImport.steps.connector.createConnectorLabel',
  {
    defaultMessage: 'Create new connector',
  }
);

export const SUPPORTED_MODELS_INFO = i18n.translate(
  'xpack.automaticImport.steps.connector.supportedModelsInfo',
  {
    defaultMessage:
      "We currently recommend using a provider that supports the newer Claude models for the best experience. We're currently working on adding better support for GPT-4 and similar models",
  }
);
