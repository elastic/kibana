/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { ChromeBreadcrumb, CoreStart } from '@kbn/core/public';

import type { NavigateToPath } from '../contexts/kibana';
import { ML_PAGES } from '../../../common/constants/locator';

export type NavigateToApp = CoreStart['application']['navigateToApp'];

type ManagementBreadcrumbType = ChromeBreadcrumb & {
  appId?: string;
  path?: string;
};
const stackManagementBreadcrumbText = i18n.translate(
  'xpack.ml.settings.breadcrumbs.stackManagementLabel',
  {
    defaultMessage: 'Stack Management',
  }
);

export const ANOMALY_DETECTION_MANAGEMENT_BREADCRUMB: ManagementBreadcrumbType = {
  text: i18n.translate('xpack.ml.anomalyDetectionManagementBreadcrumbLabel', {
    defaultMessage: 'Anomaly Detection Jobs',
  }),
  appId: 'anomaly_detection',
  path: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
  deepLinkId: 'ml:anomalyDetection',
};

export const CREATE_JOB_MANAGEMENT_BREADCRUMB: ManagementBreadcrumbType = {
  text: i18n.translate('xpack.ml.createJobManagementBreadcrumbLabel', {
    defaultMessage: 'Create job',
  }),
  path: ML_PAGES.ANOMALY_DETECTION_CREATE_JOB,
  appId: `anomaly_detection`,
};

export const DATA_FRAME_ANALYTICS_MANAGEMENT_BREADCRUMB: ManagementBreadcrumbType = {
  text: i18n.translate('xpack.ml.dataFrameAnalyticsManagementLabel', {
    defaultMessage: 'Data Frame Analytics Jobs',
  }),
  appId: 'analytics',
  path: ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE,
  deepLinkId: 'ml:dataFrameAnalytics',
};

export const TRAINED_MODELS_MANAGEMENT_BREADCRUMB: ManagementBreadcrumbType = {
  text: i18n.translate('xpack.ml.trainedModelManagementLabel', {
    defaultMessage: 'Trained Models',
  }),
  appId: 'trained_models',
  path: '',
  deepLinkId: 'management:trained_models',
};

export const SUPPLIED_CONFIGURATIONS_MANAGEMENT_BREADCRUMB: ManagementBreadcrumbType = {
  text: i18n.translate('xpack.ml.suppliedConfigurationsManagementLabel', {
    defaultMessage: 'Supplied configurations',
  }),
  appId: `anomaly_detection`,
  path: 'ad_supplied_configurations',
  deepLinkId: 'ml:suppliedConfigurations',
};

export const SETTINGS_MANAGEMENT_BREADCRUMB: ManagementBreadcrumbType = {
  text: i18n.translate('xpack.ml.settingsBreadcrumbLabel', {
    defaultMessage: 'Anomaly Detection Settings',
  }),
  appId: 'ad_settings',
  path: '',
  deepLinkId: 'ml:settings',
};

export const FILTER_LISTS_MANAGEMENT_BREADCRUMB: ManagementBreadcrumbType = {
  text: i18n.translate('xpack.ml.settings.breadcrumbs.filterListsManagementLabel', {
    defaultMessage: 'Filter lists',
  }),
  appId: 'ad_settings',
  path: ML_PAGES.FILTER_LISTS_MANAGE,
  deepLinkId: 'ml:filterListsSettings',
};

export const CALENDAR_LISTS_MANAGEMENT_BREADCRUMB: ManagementBreadcrumbType = {
  text: i18n.translate('xpack.ml.settings.breadcrumbs.calendarListManagementLabel', {
    defaultMessage: 'Calendar management',
  }),
  appId: 'ad_settings',
  path: ML_PAGES.CALENDARS_MANAGE,
  deepLinkId: 'ml:calendarSettings',
};

export const CALENDAR_DST_LISTS_MANAGEMENT_BREADCRUMB: ManagementBreadcrumbType = {
  text: i18n.translate('xpack.ml.settings.breadcrumbs.calendarListManagementLabel', {
    defaultMessage: 'Calendar DST management',
  }),
  appId: 'ad_settings',
  path: ML_PAGES.CALENDARS_DST_MANAGE,
  deepLinkId: 'ml:calendarSettings',
};

export const ML_BREADCRUMB: ChromeBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.machineLearningBreadcrumbLabel', {
    defaultMessage: 'Machine Learning',
  }),
  href: '/',
});

export const DATA_VISUALIZER_BREADCRUMB: ChromeBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.datavisualizerBreadcrumbLabel', {
    defaultMessage: 'Data Visualizer',
  }),
  href: '/datavisualizer',
  deepLinkId: 'ml:dataVisualizer',
});

// we need multiple AIOPS_BREADCRUMB breadcrumb items as they each need to link
// to each of the AIOps pages.
export const AIOPS_BREADCRUMB_LOG_RATE_ANALYSIS: ChromeBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.aiopsBreadcrumbLabel', {
    defaultMessage: 'AIOps Labs',
  }),
  href: '/aiops/log_rate_analysis_index_select',
});

export const AIOPS_BREADCRUMB_LOG_PATTERN_ANALYSIS: ChromeBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.aiopsBreadcrumbLabel', {
    defaultMessage: 'AIOps Labs',
  }),
  href: '/aiops/log_categorization_index_select',
});

export const AIOPS_BREADCRUMB_CHANGE_POINT_DETECTION: ChromeBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.aiopsBreadcrumbLabel', {
    defaultMessage: 'AIOps Labs',
  }),
  href: '/aiops/change_point_detection_index_select',
});

export const LOG_RATE_ANALYSIS: ChromeBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.aiops.logRateAnalysisBreadcrumbLabel', {
    defaultMessage: 'Log Rate Analysis',
  }),
  href: '/aiops/log_rate_analysis_index_select',
  deepLinkId: 'ml:logRateAnalysis',
});

export const LOG_PATTERN_ANALYSIS: ChromeBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.aiops.logPatternAnalysisBreadcrumbLabel', {
    defaultMessage: 'Log Pattern Analysis',
  }),
  href: '/aiops/log_categorization_index_select',
  deepLinkId: 'ml:logPatternAnalysis',
});

export const CHANGE_POINT_DETECTION: ChromeBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.aiops.changePointDetectionBreadcrumbLabel', {
    defaultMessage: 'Change Point Detection',
  }),
  href: '/aiops/change_point_detection_index_select',
  deepLinkId: 'ml:changePointDetections',
});

export const DATA_DRIFT_BREADCRUMB: ChromeBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.settings.breadcrumbs.dataComparisonLabel', {
    defaultMessage: 'Data Drift',
  }),
  href: '/data_drift_index_select',
  deepLinkId: 'ml:dataDrift',
});

export const DATA_DRIFT_INDEX_SELECT_BREADCRUMB: ChromeBreadcrumb = Object.freeze({
  text: i18n.translate('xpack.ml.settings.breadcrumbs.dataComparisonLabel', {
    defaultMessage: 'Select Data View',
  }),
  href: '/data_drift_index_select',
  deepLinkId: 'ml:dataDrift',
});

const managementBreadcrumbs = {
  ANOMALY_DETECTION_MANAGEMENT_BREADCRUMB,
  CALENDAR_DST_LISTS_MANAGEMENT_BREADCRUMB,
  CALENDAR_LISTS_MANAGEMENT_BREADCRUMB,
  CREATE_JOB_MANAGEMENT_BREADCRUMB,
  DATA_FRAME_ANALYTICS_MANAGEMENT_BREADCRUMB,
  FILTER_LISTS_MANAGEMENT_BREADCRUMB,
  SUPPLIED_CONFIGURATIONS_MANAGEMENT_BREADCRUMB,
  SETTINGS_MANAGEMENT_BREADCRUMB,
  TRAINED_MODELS_MANAGEMENT_BREADCRUMB,
};
type ManagementBreadcrumb = keyof typeof managementBreadcrumbs;

const breadcrumbs = {
  ML_BREADCRUMB,
  DATA_DRIFT_INDEX_SELECT_BREADCRUMB,
  DATA_VISUALIZER_BREADCRUMB,
  AIOPS_BREADCRUMB_LOG_RATE_ANALYSIS,
  AIOPS_BREADCRUMB_LOG_PATTERN_ANALYSIS,
  AIOPS_BREADCRUMB_CHANGE_POINT_DETECTION,
  LOG_RATE_ANALYSIS,
  LOG_PATTERN_ANALYSIS,
  CHANGE_POINT_DETECTION,
};
type Breadcrumb = keyof typeof breadcrumbs;

export const breadcrumbOnClickFactory = (
  path: string | undefined,
  navigateToPath: NavigateToPath
): ChromeBreadcrumb['onClick'] => {
  return (e) => {
    e.preventDefault();
    navigateToPath(path);
  };
};

export const getBreadcrumbWithUrlForApp = (
  breadcrumbName: Breadcrumb,
  navigateToPath?: NavigateToPath,
  basePath?: string
): ChromeBreadcrumb => {
  return {
    text: breadcrumbs[breadcrumbName].text,
    ...(navigateToPath
      ? {
          href: `${basePath}/app/ml${breadcrumbs[breadcrumbName].href}`,
          deepLinkId: breadcrumbs[breadcrumbName].deepLinkId,
          onClick: breadcrumbOnClickFactory(breadcrumbs[breadcrumbName].href, navigateToPath),
        }
      : {}),
  };
};

export const getStackManagementBreadcrumb = (navigateToApp: NavigateToApp): ChromeBreadcrumb => {
  return {
    text: stackManagementBreadcrumbText,
    onClick: (e) => {
      e.preventDefault();
      navigateToApp('management');
    },
  };
};

export const getMlManagementBreadcrumb = (
  breadcrumbName: ManagementBreadcrumb,
  navigateToApp: NavigateToApp
): ChromeBreadcrumb => {
  const { appId, deepLinkId, path, text } = managementBreadcrumbs[breadcrumbName];
  return {
    text,
    onClick: (e) => {
      e.preventDefault();
      navigateToApp('management', { path: `/ml/${appId}/${path}` });
    },
    ...(deepLinkId ? { deepLinkId } : {}),
  };
};

export const getADSettingsBreadcrumbs = (navigateToApp: NavigateToApp) => {
  return [
    getStackManagementBreadcrumb(navigateToApp),
    getMlManagementBreadcrumb('ANOMALY_DETECTION_MANAGEMENT_BREADCRUMB', navigateToApp),
    getMlManagementBreadcrumb('SETTINGS_MANAGEMENT_BREADCRUMB', navigateToApp),
  ];
};
