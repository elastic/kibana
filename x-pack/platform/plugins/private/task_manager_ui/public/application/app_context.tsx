/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { IUiSettingsClient, NotificationsStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { TaskManagerUiApi } from '../lib/api';

export interface TaskManagerUiAppContextValue {
  api: TaskManagerUiApi;
  uiSettings: IUiSettingsClient;
  notifications: NotificationsStart;
  data: DataPublicPluginStart;
}

const TaskManagerUiAppContext = createContext<TaskManagerUiAppContextValue | undefined>(undefined);

export const TaskManagerUiAppContextProvider: React.FC<
  React.PropsWithChildren<TaskManagerUiAppContextValue>
> = ({ children, api, uiSettings, notifications, data }) => (
  <TaskManagerUiAppContext.Provider value={{ api, uiSettings, notifications, data }}>
    {children}
  </TaskManagerUiAppContext.Provider>
);

export const useTaskManagerUiAppContext = (): TaskManagerUiAppContextValue => {
  const context = useContext(TaskManagerUiAppContext);
  if (!context) {
    throw new Error(
      'useTaskManagerUiAppContext must be used within TaskManagerUiAppContextProvider'
    );
  }
  return context;
};
