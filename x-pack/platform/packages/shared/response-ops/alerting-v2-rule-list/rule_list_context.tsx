/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { createContext, useContext, useMemo } from 'react';
import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';

export interface RuleListServices {
  http: HttpStart;
  notifications: NotificationsStart;
}

const RuleListContext = createContext<RuleListServices | undefined>(undefined);

export const RuleListProvider = ({
  children,
  services,
}: PropsWithChildren<{ services: RuleListServices }>) => {
  const value = useMemo(() => services, [services]);
  return <RuleListContext.Provider value={value}>{children}</RuleListContext.Provider>;
};

export const useRuleListServices = (): RuleListServices => {
  const context = useContext(RuleListContext);
  if (!context) {
    throw new Error('useRuleListServices must be used within RuleListProvider');
  }
  return context;
};
