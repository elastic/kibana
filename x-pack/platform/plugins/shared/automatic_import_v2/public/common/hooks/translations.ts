/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

// Connector loading
export const LOAD_CONNECTORS_ERROR_TITLE = i18n.translate(
  'xpack.automaticImportV2.hooks.loadConnectors.errorTitle',
  {
    defaultMessage: 'Unable to load connectors',
  }
);
export const LOAD_CONNECTORS_ERROR_MESSAGE = i18n.translate(
  'xpack.automaticImportV2.hooks.loadConnectors.errorMessage',
  {
    defaultMessage: 'Failed to load connectors',
  }
);
