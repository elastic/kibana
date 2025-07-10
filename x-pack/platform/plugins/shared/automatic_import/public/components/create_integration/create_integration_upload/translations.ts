/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const UPLOAD_TITLE = i18n.translate('xpack.automaticImport.createIntegrationUpload.title', {
  defaultMessage: 'Upload integration package',
});

export const UPLOAD_INPUT_TEXT = i18n.translate(
  'xpack.automaticImport.createIntegrationUpload.inputText',
  {
    defaultMessage: 'Drag and drop a .zip file or Browse files',
  }
);

export const INSTALL_BUTTON = i18n.translate(
  'xpack.automaticImport.createIntegrationUpload.install',
  {
    defaultMessage: 'Add to Elastic',
  }
);

export const CLOSE_BUTTON = i18n.translate('xpack.automaticImport.createIntegrationUpload.close', {
  defaultMessage: 'Close',
});

export const UPLOAD_ERROR = i18n.translate('xpack.automaticImport.createIntegrationUpload.error', {
  defaultMessage: 'Error installing package',
});
