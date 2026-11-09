/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';
import { createApi } from './api';
import { App } from './components/app';

export interface RenderAppDependencies {
  coreStart: CoreStart;
  share: SharePluginStart;
  projectId: string;
}

export const renderApp = (
  { coreStart, share, projectId }: RenderAppDependencies,
  { element }: AppMountParameters
) => {
  coreStart.chrome.docTitle.change(PLUGIN_NAME);
  coreStart.chrome.setBreadcrumbs([{ text: PLUGIN_NAME }]);

  const root = createRoot(element);
  root.render(
    coreStart.rendering.addContext(
      <App
        api={createApi(coreStart.http)}
        share={share}
        toasts={coreStart.notifications.toasts}
        openConfirm={coreStart.overlays.openConfirm}
        projectId={projectId}
        canWrite={coreStart.application.capabilities[PLUGIN_ID]?.write === true}
      />
    )
  );

  return () => {
    coreStart.chrome.docTitle.reset();
    root.unmount();
  };
};
