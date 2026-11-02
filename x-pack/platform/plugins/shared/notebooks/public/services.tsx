/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, type PropsWithChildren } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { NotebookStartDependencies } from './plugin';

export interface NotebookServices {
  core: CoreStart;
  plugins: NotebookStartDependencies;
}

const ServicesContext = createContext<NotebookServices | null>(null);

export const NotebookServicesProvider = ({
  services,
  children,
}: PropsWithChildren<{ services: NotebookServices }>) => (
  <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>
);

export const useNotebookServices = (): NotebookServices => {
  const services = useContext(ServicesContext);
  if (!services) {
    throw new Error('useNotebookServices must be used inside NotebookServicesProvider');
  }
  return services;
};
