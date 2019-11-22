/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Breadcrumb } from 'ui/chrome';
import {
  ANOMALY_DETECTION_BREADCRUMB,
  DATA_VISUALIZER_BREADCRUMB,
  ML_BREADCRUMB,
} from '../breadcrumbs';

export function getJobManagementBreadcrumbs(): Breadcrumb[] {
  // Whilst top level nav menu with tabs remains,
  // use root ML breadcrumb.
  return [
    ML_BREADCRUMB,
    ANOMALY_DETECTION_BREADCRUMB,
    {
      text: i18n.translate('xpack.ml.anomalyDetection.jobManagementLabel', {
        defaultMessage: 'Job Management',
      }),
      href: '',
    },
  ];
}

export function getCreateJobBreadcrumbs(): Breadcrumb[] {
  return [
    ML_BREADCRUMB,
    ANOMALY_DETECTION_BREADCRUMB,
    {
      text: i18n.translate('xpack.ml.jobsBreadcrumbs.createJobLabel', {
        defaultMessage: 'Create job',
      }),
      href: '#/jobs/new_job',
    },
  ];
}

export function getCreateSingleMetricJobBreadcrumbs(): Breadcrumb[] {
  return [
    ...getCreateJobBreadcrumbs(),
    {
      text: i18n.translate('xpack.ml.jobsBreadcrumbs.singleMetricLabel', {
        defaultMessage: 'Single metric',
      }),
      href: '',
    },
  ];
}

export function getCreateMultiMetricJobBreadcrumbs(): Breadcrumb[] {
  return [
    ...getCreateJobBreadcrumbs(),
    {
      text: i18n.translate('xpack.ml.jobsBreadcrumbs.multiMetricLabel', {
        defaultMessage: 'Multi metric',
      }),
      href: '',
    },
  ];
}

export function getCreatePopulationJobBreadcrumbs(): Breadcrumb[] {
  return [
    ...getCreateJobBreadcrumbs(),
    {
      text: i18n.translate('xpack.ml.jobsBreadcrumbs.populationLabel', {
        defaultMessage: 'Population',
      }),
      href: '',
    },
  ];
}

export function getAdvancedJobConfigurationBreadcrumbs(): Breadcrumb[] {
  return [
    ...getCreateJobBreadcrumbs(),
    {
      text: i18n.translate('xpack.ml.jobsBreadcrumbs.advancedConfigurationLabel', {
        defaultMessage: 'Advanced configuration',
      }),
      href: '',
    },
  ];
}

export function getCreateRecognizerJobBreadcrumbs($routeParams: any): Breadcrumb[] {
  return [
    ...getCreateJobBreadcrumbs(),
    {
      text: $routeParams.id,
      href: '',
    },
  ];
}

export function getDataVisualizerIndexOrSearchBreadcrumbs(): Breadcrumb[] {
  return [
    ML_BREADCRUMB,
    DATA_VISUALIZER_BREADCRUMB,
    {
      text: i18n.translate('xpack.ml.jobsBreadcrumbs.selectIndexOrSearchLabel', {
        defaultMessage: 'Select index or search',
      }),
      href: '',
    },
  ];
}
