/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import type { CoreStart, ScopedHistory } from '@kbn/core/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { IndexExplorerApi } from './api';

export interface Services {
  readonly core: CoreStart;
  readonly api: IndexExplorerApi;
  readonly history: ScopedHistory;
  readonly dataViews: DataViewsPublicPluginStart;
  readonly lens: LensPublicStart;
}

const ServicesContext = createContext<Services | undefined>(undefined);

export const ServicesProvider = ServicesContext.Provider;

/** Returns the services provided to the Index Explorer app. */
export function useServices(): Services {
  const services = useContext(ServicesContext);
  if (!services) {
    throw new Error('useServices must be used within a ServicesProvider');
  }
  return services;
}
