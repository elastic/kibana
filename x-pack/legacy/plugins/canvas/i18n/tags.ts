/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const TagStrings = {
  getChartLabel: () =>
    i18n.translate('xpack.canvas.tags.chartLabel', {
      defaultMessage: 'chart',
    }),
  getFilterLabel: () =>
    i18n.translate('xpack.canvas.tags.filterLabel', {
      defaultMessage: 'filter',
    }),
  getGraphicLabel: () =>
    i18n.translate('xpack.canvas.tags.graphicLabel', {
      defaultMessage: 'graphic',
    }),
  getPresentationLabel: () =>
    i18n.translate('xpack.canvas.tags.presentationLabel', {
      defaultMessage: 'presentation',
    }),
  getProportionLabel: () =>
    i18n.translate('xpack.canvas.tags.proportionLabel', {
      defaultMessage: 'proportion',
    }),
  getReportLabel: () =>
    i18n.translate('xpack.canvas.tags.reportLabel', {
      defaultMessage: 'report',
    }),
  getTextLabel: () =>
    i18n.translate('xpack.canvas.tags.textLabel', {
      defaultMessage: 'text',
    }),
};
