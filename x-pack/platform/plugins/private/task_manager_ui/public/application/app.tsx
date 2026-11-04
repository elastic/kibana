/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect, useParams } from 'react-router-dom';
import { Route, Routes } from '@kbn/shared-ux-router';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import type { TasksApi } from './api';
import { BackgroundTasksPage } from './background_tasks_page';
import { TaskDetailsPage } from './task_details_page';

export const TASK_DETAILS_PATH = '/task';

export const taskDetailsPath = (id: string) => `${TASK_DETAILS_PATH}/${encodeURIComponent(id)}`;

interface AppProps {
  api: TasksApi;
  setBreadcrumbs: ManagementAppMountParams['setBreadcrumbs'];
}

const TaskDetailsRoute = ({ api, setBreadcrumbs }: AppProps) => {
  const { id } = useParams<{ id: string }>();
  return (
    <TaskDetailsPage api={api} taskId={decodeURIComponent(id)} setBreadcrumbs={setBreadcrumbs} />
  );
};

export const App = ({ api, setBreadcrumbs }: AppProps) => (
  <Routes>
    <Route path={`${TASK_DETAILS_PATH}/:id`}>
      <TaskDetailsRoute api={api} setBreadcrumbs={setBreadcrumbs} />
    </Route>
    <Route path="/" exact>
      <BackgroundTasksPage api={api} setBreadcrumbs={setBreadcrumbs} />
    </Route>
    <Redirect to="/" />
  </Routes>
);
