/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const TagStrings: { [key: string]: () => string } = {
  chart: () =>
    i18n.translate('xpack.canvas.tags.chartTag', {
      defaultMessage: 'chart',
    }),
  filter: () =>
    i18n.translate('xpack.canvas.tags.filterTag', {
      defaultMessage: 'filter',
    }),
  graphic: () =>
    i18n.translate('xpack.canvas.tags.graphicTag', {
      defaultMessage: 'graphic',
    }),
  presentation: () =>
    i18n.translate('xpack.canvas.tags.presentationTag', {
      defaultMessage: 'presentation',
    }),
  proportion: () =>
    i18n.translate('xpack.canvas.tags.proportionTag', {
      defaultMessage: 'proportion',
    }),
  report: () =>
    i18n.translate('xpack.canvas.tags.reportTag', {
      defaultMessage: 'report',
    }),
  text: () =>
    i18n.translate('xpack.canvas.tags.textTag', {
      defaultMessage: 'text',
    }),
};
