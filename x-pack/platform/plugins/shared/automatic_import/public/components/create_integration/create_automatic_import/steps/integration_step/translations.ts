/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TITLE = i18n.translate('xpack.automaticImport.step.integration.title', {
  defaultMessage: 'Integration details',
});
export const DESCRIPTION = i18n.translate('xpack.automaticImport.step.integration.description', {
  defaultMessage: 'Name your integration, give it a description, and (optional) add a logo',
});

export const TITLE_LABEL = i18n.translate(
  'xpack.automaticImport.step.integration.integrationTitle',
  {
    defaultMessage: 'Title',
  }
);
export const DESCRIPTION_LABEL = i18n.translate(
  'xpack.automaticImport.step.integration.integrationDescription',
  {
    defaultMessage: 'Description',
  }
);
export const LOGO_LABEL = i18n.translate('xpack.automaticImport.step.integration.logo.label', {
  defaultMessage: 'Logo (optional)',
});

export const LOGO_DESCRIPTION = i18n.translate(
  'xpack.automaticImport.step.integration.logo.description',
  {
    defaultMessage: 'Drag and drop a .svg file or Browse files',
  }
);

export const PREVIEW = i18n.translate('xpack.automaticImport.step.integration.preview', {
  defaultMessage: 'Preview',
});

export const PREVIEW_TOOLTIP = i18n.translate(
  'xpack.automaticImport.step.integration.previewTooltip',
  {
    defaultMessage: 'This is a preview of the integration card for the integrations catalog',
  }
);

export const LOGO_ERROR = i18n.translate('xpack.automaticImport.step.integration.logo.error', {
  defaultMessage: 'Error processing logo file',
});
