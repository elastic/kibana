/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * flyout container
 */
export const OPEN_API_SPEC_TITLE = i18n.translate(
  'xpack.automaticImport.celFlyout.createCel.openApiSpecTitle',
  {
    defaultMessage: 'OpenAPI spec',
  }
);
export const UPLOAD_SPEC_TITLE = i18n.translate(
  'xpack.automaticImport.celFlyout.createCel.uploadSpecTitle',
  {
    defaultMessage: 'Upload OpenAPI Specification',
  }
);
export const CONFIRM_SETTINGS_TITLE = i18n.translate(
  'xpack.automaticImport.celFlyout.createCel.confirmSettingsTitle',
  {
    defaultMessage: 'Choose API endpoint and Authentication method',
  }
);

/**
 * footer
 */
export const SAVE_CONFIG = i18n.translate(
  'xpack.automaticImport.celFlyout.footer.saveAndContinue',
  {
    defaultMessage: 'Save Configuration',
  }
);
export const CANCEL = i18n.translate('xpack.automaticImport.celFlyout.footer.cancel', {
  defaultMessage: 'Cancel',
});
export const ANALYZE_BUTTON_HINT = i18n.translate(
  'xpack.automaticImport.celFlyout.footer.analyzeHint',
  {
    defaultMessage: 'Analyze your OpenAPI spec file before saving',
  }
);
export const GENERATE_BUTTON_HINT = i18n.translate(
  'xpack.automaticImport.celFlyout.footer.generateHint',
  {
    defaultMessage: 'Generate your CEL input configuration before saving',
  }
);

/**
 * generation error
 */
export const RETRY = i18n.translate('xpack.automaticImport.celFlyout.retry', {
  defaultMessage: 'Retry',
});
