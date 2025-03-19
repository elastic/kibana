/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { ScreenshotModePluginSetup } from '@kbn/screenshot-mode-plugin/public';
import type { SharePluginSetup } from '@kbn/share-plugin/public';

import type { ReportingAPIClient } from '@kbn/reporting-public';
import { RedirectApp } from './redirect_app';

interface MountParams extends AppMountParameters {
  apiClient: ReportingAPIClient;
  screenshotMode: ScreenshotModePluginSetup;
  share: SharePluginSetup;
}

export const mountRedirectApp = (
  coreStart: CoreStart,
  { element, apiClient, history, screenshotMode, share }: MountParams
) => {
  render(
    <KibanaRenderContextProvider {...coreStart}>
      <RedirectApp
        apiClient={apiClient}
        history={history}
        screenshotMode={screenshotMode}
        share={share}
      />
    </KibanaRenderContextProvider>,
    element
  );

  return () => {
    unmountComponentAtNode(element);
  };
};
