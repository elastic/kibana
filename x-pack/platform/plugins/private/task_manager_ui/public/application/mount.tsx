/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { CoreSetup } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { Router } from '@kbn/shared-ux-router';
import { BACKGROUND_TASKS_TITLE } from '../constants';
import { createTasksApi } from './api';
import { App } from './app';

interface MountParams {
  core: CoreSetup;
  params: ManagementAppMountParams;
}

export const mountManagementSection = async ({
  core,
  params: { element, setBreadcrumbs, history },
}: MountParams) => {
  const [coreStart] = await core.getStartServices();
  coreStart.chrome.docTitle.change(BACKGROUND_TASKS_TITLE);

  const api = createTasksApi(coreStart.http);

  ReactDOM.render(
    <KibanaRenderContextProvider {...coreStart}>
      <Router history={history}>
        <App api={api} setBreadcrumbs={setBreadcrumbs} />
      </Router>
    </KibanaRenderContextProvider>,
    element
  );

  return () => {
    coreStart.chrome.docTitle.reset();
    ReactDOM.unmountComponentAtNode(element);
  };
};
