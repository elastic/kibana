/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEvent } from 'react';
import { useCallback, useMemo } from 'react';
import type { AppHeaderBack } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { ML_PAGES } from '@kbn/ml-common-types/locator_ml_pages';
import { PLUGIN_ID } from '../../../../common/constants/app';
import { useMlKibana, useNavigateToPath } from '../../contexts/kibana';

/**
 * Builds an {@link AppHeaderBack} target for chrome-next headers in the ML app.
 * Replaces clickable parent breadcrumbs that are no longer interactive in the new header.
 *
 * Pass `label` as the destination name only — AppHeader renders it as "Back to {label}".
 */
export const useMlAppHeaderBack = (path: string, label: string): AppHeaderBack => {
  const {
    services: {
      application: { getUrlForApp },
    },
  } = useMlKibana();
  const navigateToPath = useNavigateToPath();

  const onClick = useCallback(
    (event: MouseEvent) => {
      // Keep href for open-in-new-tab / copy-link, but prevent a full page reload on click.
      event.preventDefault();
      navigateToPath(path);
    },
    [navigateToPath, path]
  );

  return useMemo(
    () => ({
      href: getUrlForApp(PLUGIN_ID, { path }),
      label,
      onClick,
    }),
    [getUrlForApp, label, onClick, path]
  );
};

/**
 * Builds an {@link AppHeaderBack} target for ML pages hosted under Stack Management.
 */
export const useMlManagementAppHeaderBack = (
  appId: string,
  path: string,
  label: string
): AppHeaderBack => {
  const {
    services: {
      application: { getUrlForApp, navigateToApp },
    },
  } = useMlKibana();

  // Match getMlManagementBreadcrumb path shape: `/ml/${appId}/${path}`
  const managementPath = `/ml/${appId}/${path}`;

  const onClick = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();
      navigateToApp('management', { path: managementPath });
    },
    [navigateToApp, managementPath]
  );

  return useMemo(
    () => ({
      href: getUrlForApp('management', { path: managementPath }),
      label,
      onClick,
    }),
    [getUrlForApp, label, onClick, managementPath]
  );
};

export const DATA_VISUALIZER_BACK_LABEL = i18n.translate('xpack.ml.datavisualizerBreadcrumbLabel', {
  defaultMessage: 'Data visualizer',
});

export const ANOMALY_DETECTION_JOBS_BACK_LABEL = i18n.translate(
  'xpack.ml.anomalyDetectionManagementBreadcrumbLabel',
  {
    defaultMessage: 'Anomaly detection jobs',
  }
);

export const DATA_FRAME_ANALYTICS_JOBS_BACK_LABEL = i18n.translate(
  'xpack.ml.dataFrameAnalyticsManagementLabel',
  {
    defaultMessage: 'Data frame analytics jobs',
  }
);

export const ANOMALY_DETECTION_SETTINGS_BACK_LABEL = i18n.translate(
  'xpack.ml.settingsBreadcrumbLabel',
  {
    defaultMessage: 'Anomaly detection settings',
  }
);

export const CALENDAR_MANAGEMENT_BACK_LABEL = i18n.translate(
  'xpack.ml.settings.breadcrumbs.calendarListManagementLabel',
  {
    defaultMessage: 'Calendar management',
  }
);

export const CALENDAR_DST_MANAGEMENT_BACK_LABEL = i18n.translate(
  'xpack.ml.settings.breadcrumbs.calendarDstListManagementLabel',
  {
    defaultMessage: 'Calendar DST management',
  }
);

export const FILTER_LISTS_BACK_LABEL = i18n.translate(
  'xpack.ml.settings.breadcrumbs.filterListsManagementLabel',
  {
    defaultMessage: 'Filter lists',
  }
);

/** Back navigation from Data visualizer child pages to the selector landing page. */
export const useDataVisualizerBack = (): AppHeaderBack =>
  useMlAppHeaderBack(`/${ML_PAGES.DATA_VISUALIZER}`, DATA_VISUALIZER_BACK_LABEL);

/** Back navigation to the anomaly detection jobs list (Stack Management). */
export const useAnomalyDetectionJobsBack = (): AppHeaderBack =>
  useMlManagementAppHeaderBack(
    'anomaly_detection',
    ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
    ANOMALY_DETECTION_JOBS_BACK_LABEL
  );

/** Back navigation to the data frame analytics jobs list (Stack Management). */
export const useDataFrameAnalyticsJobsBack = (): AppHeaderBack =>
  useMlManagementAppHeaderBack(
    'analytics',
    ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE,
    DATA_FRAME_ANALYTICS_JOBS_BACK_LABEL
  );

/** Back navigation to anomaly detection settings (Stack Management). */
export const useAnomalyDetectionSettingsBack = (): AppHeaderBack =>
  useMlManagementAppHeaderBack('ad_settings', '', ANOMALY_DETECTION_SETTINGS_BACK_LABEL);

/** Back navigation to filter lists (Stack Management). */
export const useFilterListsBack = (): AppHeaderBack =>
  useMlManagementAppHeaderBack(
    'ad_settings',
    ML_PAGES.FILTER_LISTS_MANAGE,
    FILTER_LISTS_BACK_LABEL
  );

/** Back navigation to calendar management (Stack Management). */
export const useCalendarManagementBack = (isDst: boolean): AppHeaderBack =>
  useMlManagementAppHeaderBack(
    'ad_settings',
    isDst ? ML_PAGES.CALENDARS_DST_MANAGE : ML_PAGES.CALENDARS_MANAGE,
    isDst ? CALENDAR_DST_MANAGEMENT_BACK_LABEL : CALENDAR_MANAGEMENT_BACK_LABEL
  );
