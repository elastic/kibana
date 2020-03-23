/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

interface TemplateStrings {
  name: string;
  help: string;
}

interface TemplateStringDict {
  [templateName: string]: TemplateStrings;
}

/**
 * This function will return a dictionary of strings, organized by Canvas
 * Element specification.  This function requires that `i18nProvider` be
 * properly initialized.
 */
export const getTemplateStrings = (): TemplateStringDict => ({
  Dark: {
    name: i18n.translate('xpack.canvas.templates.darkName', {
      defaultMessage: 'Dark',
    }),
    help: i18n.translate('xpack.canvas.templates.darkHelp', {
      defaultMessage: 'Dark color themed presentation deck',
    }),
  },
  Light: {
    name: i18n.translate('xpack.canvas.templates.lightName', {
      defaultMessage: 'Light',
    }),
    help: i18n.translate('xpack.canvas.templates.lightHelp', {
      defaultMessage: 'Light color themed presentation deck',
    }),
  },
  Pitch: {
    name: i18n.translate('xpack.canvas.templates.pitchName', {
      defaultMessage: 'Pitch',
    }),
    help: i18n.translate('xpack.canvas.templates.pitchHelp', {
      defaultMessage: 'Branded presentation with large photos',
    }),
  },
  Status: {
    name: i18n.translate('xpack.canvas.templates.statusName', {
      defaultMessage: 'Status',
    }),
    help: i18n.translate('xpack.canvas.templates.statusHelp', {
      defaultMessage: 'Document-style report with live charts',
    }),
  },
  Summary: {
    name: i18n.translate('xpack.canvas.templates.summaryDisplayName', {
      defaultMessage: 'Summary',
    }),
    help: i18n.translate('xpack.canvas.templates.summaryHelp', {
      defaultMessage: 'Infographic-style report with live charts',
    }),
  },
});
