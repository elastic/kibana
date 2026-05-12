/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { DashboardRenderer } from '@kbn/dashboard-plugin/public';
import type { DashboardState } from '@kbn/dashboard-plugin/common';
import {
  attachmentDataToDashboardState,
  type DashboardAttachmentData,
} from '@kbn/dashboard-agent-common';
import type { DashboardAgentPluginPublicStartDependencies } from '../types';
import { DASHBOARD_SCREENSHOT_CONTEXT_KEY } from '../../common';

export const renderDashboardScreenshotApp = ({
  coreStart,
  pluginsStart,
  params,
}: {
  coreStart: CoreStart;
  pluginsStart: DashboardAgentPluginPublicStartDependencies;
  params: AppMountParameters;
}) => {
  coreStart.chrome.setIsVisible(false);
  const root = createRoot(params.element);

  root.render(
    coreStart.rendering.addContext(
      <DashboardScreenshotApp
        dashboardData={pluginsStart.screenshotMode.getScreenshotContext<DashboardAttachmentData>(
          DASHBOARD_SCREENSHOT_CONTEXT_KEY
        )}
      />
    )
  );

  return () => root.unmount();
};

export const DashboardScreenshotApp = ({
  dashboardData,
}: {
  dashboardData?: DashboardAttachmentData;
}) => {
  const dashboardState = useMemo<DashboardState | undefined>(() => {
    if (!dashboardData) {
      return undefined;
    }

    try {
      return attachmentDataToDashboardState(dashboardData);
    } catch {
      return undefined;
    }
  }, [dashboardData]);

  const getCreationOptions = useCallback(
    () =>
      Promise.resolve({
        getInitialInput: () => ({ ...dashboardState!, viewMode: 'view' as const }),
      }),
    [dashboardState]
  );

  if (!dashboardState) {
    return (
      <div data-shared-items-container data-shared-items-count={1}>
        <div data-shared-item>Dashboard screenshot context is missing or invalid.</div>
      </div>
    );
  }

  return (
    <div style={rootStyle}>
      <DashboardRenderer getCreationOptions={getCreationOptions} showPlainSpinner />
    </div>
  );
};

const rootStyle: React.CSSProperties = {
  width: 1440,
  minHeight: 1200,
};
