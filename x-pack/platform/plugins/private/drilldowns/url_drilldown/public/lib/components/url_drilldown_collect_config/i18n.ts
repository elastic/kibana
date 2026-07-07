/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const txtUrlTemplateLabel = i18n.translate('xpack.urlDrilldown.editor.urlTemplateLabel', {
  defaultMessage: 'Enter URL',
});

export const txtEmptyErrorMessage = i18n.translate(
  'xpack.urlDrilldown.editor.urlTemplateEmptyErrorMessage',
  {
    defaultMessage: 'URL template is required.',
  }
);

export const txtInvalidFormatErrorMessage = ({
  error,
  example,
}: {
  error: string;
  example: string;
}) =>
  i18n.translate('xpack.urlDrilldown.editor.urlTemplateInvalidFormatErrorMessage', {
    defaultMessage: '{error} Example: {example}',
    values: {
      error,
      example,
    },
  });

export const txtUrlTemplateSyntaxTestingHelpText = i18n.translate(
  'xpack.urlDrilldown.editor.urlTemplateSyntaxTestingHelpText',
  {
    defaultMessage:
      'To validate and test the URL template, save the configuration and use this drilldown from the panel.',
  }
);

export const txtUrlTemplateSyntaxHelpLinkText = i18n.translate(
  'xpack.urlDrilldown.editor.urlTemplateSyntaxHelpLinkText',
  {
    defaultMessage: 'Syntax help',
  }
);

export const txtUrlTemplateOpenInNewTab = i18n.translate(
  'xpack.urlDrilldown.editor.openInNewTabLabel',
  {
    defaultMessage: 'Open URL in new tab',
  }
);

export const txtUrlTemplateAdditionalOptions = i18n.translate(
  'xpack.urlDrilldown.editor.additionalOptions',
  {
    defaultMessage: 'Additional options',
  }
);

export const txtUrlTemplateEncodeUrl = i18n.translate('xpack.urlDrilldown.editor.encodeUrl', {
  defaultMessage: 'Encode URL',
});

export const txtUrlTemplateEncodeDescription = i18n.translate(
  'xpack.urlDrilldown.editor.encodeDescription',
  {
    defaultMessage: 'If enabled, URL will be escaped using percent encoding',
  }
);
