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
import { BACKGROUND_TASKS_TITLE } from '../constants';
import { createTasksApi } from './api';
import { BackgroundTasksPage } from './background_tasks_page';

interface MountParams {
  core: CoreSetup;
  params: ManagementAppMountParams;
}

export const mountManagementSection = async ({
  core,
  params: { element, setBreadcrumbs },
}: MountParams) => {
  const [coreStart] = await core.getStartServices();
  coreStart.chrome.docTitle.change(BACKGROUND_TASKS_TITLE);
  setBreadcrumbs([{ text: BACKGROUND_TASKS_TITLE }]);

  const api = createTasksApi(coreStart.http);

  ReactDOM.render(
    <KibanaRenderContextProvider {...coreStart}>
      <BackgroundTasksPage api={api} />
    </KibanaRenderContextProvider>,
    element
  );

  return () => {
    coreStart.chrome.docTitle.reset();
    ReactDOM.unmountComponentAtNode(element);
  };
};
