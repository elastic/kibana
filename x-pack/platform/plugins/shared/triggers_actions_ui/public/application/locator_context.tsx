/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { LocatorPublic } from '@kbn/share-plugin/public';
import type { RuleDetailsLocatorParams, RulesLocatorParams } from '@kbn/rule-data-utils';

export interface RulesLocators {
  rules: LocatorPublic<RulesLocatorParams>;
  ruleDetails: LocatorPublic<RuleDetailsLocatorParams>;
}

const LocatorContext = createContext<RulesLocators | null>(null);

export const LocatorProvider = ({
  locators,
  children,
}: {
  locators: RulesLocators;
  children: React.ReactNode;
}) => <LocatorContext.Provider value={locators}>{children}</LocatorContext.Provider>;

export const useLocators = (): RulesLocators => {
  const locators = useContext(LocatorContext);
  if (!locators) {
    throw new Error('useLocators must be used within a LocatorProvider');
  }
  return locators;
};
