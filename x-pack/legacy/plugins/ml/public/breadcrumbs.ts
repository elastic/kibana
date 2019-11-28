/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const ML_BREADCRUMB = Object.freeze({
  text: i18n.translate('xpack.ml.machineLearningBreadcrumbLabel', {
    defaultMessage: 'Machine Learning',
  }),
  href: '#/',
});

export const SETTINGS = Object.freeze({
  text: i18n.translate('xpack.ml.settingsBreadcrumbLabel', {
    defaultMessage: 'Settings',
  }),
  href: '#/settings?',
});

export const ANOMALY_DETECTION_BREADCRUMB = Object.freeze({
  text: i18n.translate('xpack.ml.anomalyDetectionBreadcrumbLabel', {
    defaultMessage: 'Anomaly Detection',
  }),
  href: '#/jobs?',
});

export const DATA_VISUALIZER_BREADCRUMB = Object.freeze({
  text: i18n.translate('xpack.ml.datavisualizerBreadcrumbLabel', {
    defaultMessage: 'Data Visualizer',
  }),
  href: '#/datavisualizer?',
});
