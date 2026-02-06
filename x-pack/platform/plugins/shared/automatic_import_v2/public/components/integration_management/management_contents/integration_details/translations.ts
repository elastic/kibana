/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

// Integration details
export const DESCRIPTION = i18n.translate('xpack.automaticImportV2.step.integration.description', {
  defaultMessage: 'Name your integration, give it a description, and (optional) add a logo',
});
export const TITLE_LABEL = i18n.translate(
  'xpack.automaticImportV2.step.integration.integrationTitle',
  {
    defaultMessage: 'Title',
  }
);
export const DESCRIPTION_LABEL = i18n.translate(
  'xpack.automaticImportV2.step.integration.integrationDescription',
  {
    defaultMessage: 'Description',
  }
);
export const LOGO_LABEL = i18n.translate('xpack.automaticImportV2.step.integration.logo.label', {
  defaultMessage: 'Logo (optional)',
});
export const LOGO_DESCRIPTION_PART_1 = i18n.translate(
  'xpack.automaticImportV2.step.integration.logo.descriptionPart1',
  {
    defaultMessage: 'Drag and drop',
  }
);
export const LOGO_DESCRIPTION_PART_2 = i18n.translate(
  'xpack.automaticImportV2.step.integration.logo.descriptionPart2',
  {
    defaultMessage: 'a .svg file or Browse files',
  }
);

// Package card preview
export const PREVIEW = i18n.translate('xpack.automaticImportV2.step.integration.preview', {
  defaultMessage: 'Preview',
});
export const PREVIEW_TOOLTIP = i18n.translate(
  'xpack.automaticImportV2.step.integration.previewTooltip',
  {
    defaultMessage: 'This is a preview of the integration card for the integrations catalog',
  }
);
export const TITLE = i18n.translate('xpack.automaticImportV2.step.integration.title', {
  defaultMessage: 'Integration details',
});
export const LOGO_ERROR = i18n.translate('xpack.automaticImportV2.step.integration.logo.error', {
  defaultMessage: 'Error processing logo file',
});
export const getLogoTooLargeError = (fileName: string) =>
  i18n.translate('xpack.automaticImportV2.step.integration.logo.tooLarge', {
    defaultMessage: '{fileName} is too large, maximum size is 1MB.',
    values: { fileName },
  });
export const LOGO_INVALID_FORMAT = i18n.translate(
  'xpack.automaticImportV2.step.integration.logo.invalidFormat',
  {
    defaultMessage: 'Only SVG files are allowed',
  }
);
