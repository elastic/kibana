/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { CoreStart } from '@kbn/core/public';
import type { DashboardState } from '@kbn/dashboard-plugin/common';
import { DashboardRenderer } from '@kbn/dashboard-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';

const CAPTURE_WIDTH_PX = 1600;

export interface HiddenDashboardHandle {
  /** Off-screen element hosting the rendered dashboard. */
  container: HTMLElement;
  /** Unmounts the dashboard and removes the container from the DOM. */
  cleanup: () => void;
}

/**
 * Renders a dashboard into a fixed-width container parked off-screen. The container is
 * kept in the layout flow (NOT `display: none`) because charts need real dimensions to
 * render. Height is left to the dashboard grid so the whole dashboard is captured.
 */
export const renderHiddenDashboard = ({
  core,
  dashboardState,
}: {
  core: CoreStart;
  dashboardState: DashboardState;
}): HiddenDashboardHandle => {
  const container = document.createElement('div');
  container.setAttribute('data-test-subj', 'agentBuilderHiddenDashboardCapture');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '-10000px';
  container.style.width = `${CAPTURE_WIDTH_PX}px`;
  container.style.pointerEvents = 'none';
  document.body.appendChild(container);

  ReactDOM.render(
    <KibanaRenderContextProvider {...core}>
      <DashboardRenderer
        getCreationOptions={() =>
          Promise.resolve({
            getInitialInput: () => ({ ...dashboardState, viewMode: 'view' as const }),
          })
        }
        showPlainSpinner
        onApiAvailable={(api) => {
          api.setViewMode('view');
        }}
      />
    </KibanaRenderContextProvider>,
    container
  );

  return {
    container,
    cleanup: () => {
      ReactDOM.unmountComponentAtNode(container);
      container.remove();
    },
  };
};
