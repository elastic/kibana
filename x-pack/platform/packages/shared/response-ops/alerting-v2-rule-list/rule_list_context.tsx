/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { createContext, useContext, useMemo } from 'react';
import type { ApplicationStart, HttpStart, NotificationsStart } from '@kbn/core/public';

export interface RuleListServices {
  http: HttpStart;
  notifications: NotificationsStart;
  application: ApplicationStart;
}

export interface RuleListPaths {
  ruleDetails: (id: string) => string;
  ruleEdit: (id: string) => string;
  ruleCreate: string;
}

interface RuleListContextValue {
  services: RuleListServices;
  paths: RuleListPaths;
}

const RuleListContext = createContext<RuleListContextValue | undefined>(undefined);

export const RuleListProvider = ({
  children,
  services,
  paths,
}: PropsWithChildren<{ services: RuleListServices; paths: RuleListPaths }>) => {
  const value = useMemo(() => ({ services, paths }), [services, paths]);
  return <RuleListContext.Provider value={value}>{children}</RuleListContext.Provider>;
};

const useRuleListContext = (): RuleListContextValue => {
  const context = useContext(RuleListContext);
  if (!context) {
    throw new Error('useRuleListContext must be used within RuleListProvider');
  }
  return context;
};

export const useRuleListServices = (): RuleListServices => {
  const { services } = useRuleListContext();
  return services;
};

export const useRuleListPaths = (): RuleListPaths => {
  const { paths } = useRuleListContext();
  return paths;
};
