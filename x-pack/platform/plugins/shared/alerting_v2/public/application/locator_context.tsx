/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { LocatorPublic } from '@kbn/share-plugin/public';
import type {
  AlertingV2RulesLocatorParams,
  AlertingV2RuleLibraryLocatorParams,
  AlertingV2EpisodesLocatorParams,
  AlertingV2ActionPoliciesLocatorParams,
  AlertingV2ExecutionHistoryLocatorParams,
} from '../locators';

export interface AlertingV2Locators {
  rulesLocators: LocatorPublic<AlertingV2RulesLocatorParams>;
  ruleLibraryLocators: LocatorPublic<AlertingV2RuleLibraryLocatorParams>;
  episodesLocators: LocatorPublic<AlertingV2EpisodesLocatorParams>;
  actionPolicyLocators: LocatorPublic<AlertingV2ActionPoliciesLocatorParams>;
  executionHistoryLocators: LocatorPublic<AlertingV2ExecutionHistoryLocatorParams>;
}

const LocatorContext = createContext<AlertingV2Locators | null>(null);

export const LocatorProvider = ({
  locators,
  children,
}: {
  locators: AlertingV2Locators;
  children: React.ReactNode;
}) => <LocatorContext.Provider value={locators}>{children}</LocatorContext.Provider>;

export const useAlertingLocators = (): AlertingV2Locators => {
  const locators = useContext(LocatorContext);
  if (!locators) {
    throw new Error('useAlertingLocators must be used within a LocatorProvider');
  }
  return locators;
};
