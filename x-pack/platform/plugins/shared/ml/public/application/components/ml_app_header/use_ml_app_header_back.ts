/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEvent } from 'react';
import { useCallback, useMemo } from 'react';
import type { AppHeaderBack } from '@kbn/app-header';
import { PLUGIN_ID } from '../../../../common/constants/app';
import { useMlKibana, useNavigateToPath } from '../../contexts/kibana';
import type { MlAppBreadcrumb, MlManagementBreadcrumb } from '../../routing/breadcrumbs';
import {
  ANOMALY_DETECTION_MANAGEMENT_BREADCRUMB,
  CALENDAR_DST_LISTS_MANAGEMENT_BREADCRUMB,
  CALENDAR_LISTS_MANAGEMENT_BREADCRUMB,
  DATA_FRAME_ANALYTICS_MANAGEMENT_BREADCRUMB,
  DATA_VISUALIZER_BREADCRUMB,
  FILTER_LISTS_MANAGEMENT_BREADCRUMB,
  SETTINGS_MANAGEMENT_BREADCRUMB,
} from '../../routing/breadcrumbs';

/**
 * Builds an {@link AppHeaderBack} target for chrome-next headers in the ML app.
 * Replaces clickable parent breadcrumbs that are no longer interactive in the new header.
 *
 * Pass a breadcrumb whose `text` is the destination name only — AppHeader renders it as
 * "Back to {label}".
 */
export const useMlAppHeaderBack = ({ href, text }: MlAppBreadcrumb): AppHeaderBack => {
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
      navigateToPath(href);
    },
    [navigateToPath, href]
  );

  return useMemo(
    () => ({
      href: getUrlForApp(PLUGIN_ID, { path: href }),
      label: text,
      onClick,
    }),
    [getUrlForApp, text, onClick, href]
  );
};

/**
 * Builds an {@link AppHeaderBack} target for ML pages hosted under Stack Management.
 */
export const useMlManagementAppHeaderBack = ({
  appId,
  path,
  text,
}: MlManagementBreadcrumb): AppHeaderBack => {
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
      label: text,
      onClick,
    }),
    [getUrlForApp, text, onClick, managementPath]
  );
};

/** Back navigation from Data visualizer child pages to the selector landing page. */
export const useDataVisualizerBack = (): AppHeaderBack =>
  useMlAppHeaderBack(DATA_VISUALIZER_BREADCRUMB);

/** Back navigation to the anomaly detection jobs list (Stack Management). */
export const useAnomalyDetectionJobsBack = (): AppHeaderBack =>
  useMlManagementAppHeaderBack(ANOMALY_DETECTION_MANAGEMENT_BREADCRUMB);

/** Back navigation to the data frame analytics jobs list (Stack Management). */
export const useDataFrameAnalyticsJobsBack = (): AppHeaderBack =>
  useMlManagementAppHeaderBack(DATA_FRAME_ANALYTICS_MANAGEMENT_BREADCRUMB);

/** Back navigation to anomaly detection settings (Stack Management). */
export const useAnomalyDetectionSettingsBack = (): AppHeaderBack =>
  useMlManagementAppHeaderBack(SETTINGS_MANAGEMENT_BREADCRUMB);

/** Back navigation to filter lists (Stack Management). */
export const useFilterListsBack = (): AppHeaderBack =>
  useMlManagementAppHeaderBack(FILTER_LISTS_MANAGEMENT_BREADCRUMB);

/** Back navigation to calendar management (Stack Management). */
export const useCalendarManagementBack = (isDst: boolean): AppHeaderBack =>
  useMlManagementAppHeaderBack(
    isDst ? CALENDAR_DST_LISTS_MANAGEMENT_BREADCRUMB : CALENDAR_LISTS_MANAGEMENT_BREADCRUMB
  );
