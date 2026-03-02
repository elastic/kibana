/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { createContext, useContext } from 'react';
import type { HttpStart, NotificationsStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';

export interface RuleFormServices {
  http: HttpStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  notifications: NotificationsStart;
}

const RuleFormServicesContext = createContext<RuleFormServices | undefined>(undefined);

export const RuleFormServicesProvider: React.FC<
  PropsWithChildren<{ services: RuleFormServices }>
> = ({ children, services }) => (
  <RuleFormServicesContext.Provider value={services}>{children}</RuleFormServicesContext.Provider>
);

export const useRuleFormServices = (): RuleFormServices => {
  const context = useContext(RuleFormServicesContext);
  if (!context) {
    throw new Error('useRuleFormServices must be used within RuleFormServicesProvider');
  }
  return context;
};
