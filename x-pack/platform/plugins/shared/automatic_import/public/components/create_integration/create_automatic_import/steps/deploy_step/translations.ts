/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const DEPLOYING = i18n.translate('xpack.automaticImport.step.deploy.loadingTitle', {
  defaultMessage: 'Deploying',
});

export const DOWNLOAD_ZIP_TITLE = i18n.translate(
  'xpack.automaticImport.step.deploy.downloadZip.title',
  {
    defaultMessage: 'Download .zip package',
  }
);
export const DOWNLOAD_ZIP_DESCRIPTION = i18n.translate(
  'xpack.automaticImport.step.deploy.downloadZip.description',
  {
    defaultMessage: 'Download your integration package to reuse in other deployments. ',
  }
);

export const DOWNLOAD_ZIP_LINK = i18n.translate(
  'xpack.automaticImport.step.deploy.downloadZip.link',
  {
    defaultMessage: 'Download package',
  }
);
