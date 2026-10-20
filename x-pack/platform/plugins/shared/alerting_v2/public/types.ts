/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import type { AlertingV2AlertsProviderProps } from './application/alerts_provider';
import type { CreateRuleOptionsFlyoutProps } from './create_rule_options_flyout';
import type { AlertingV2PageProps } from './application/composable_pages';
import type { CreateAlertingV2HostApp } from './locator_host';

export type { CreateRuleOptionsFlyoutLegacyItem } from './create_rule_options_flyout';
export type { AlertingV2PageProps } from './application/composable_pages';
export type { AlertingV2AlertsProviderProps } from './application/alerts_provider';
export type { PrivilegeCheck } from './application/privilege_check_context';

export interface AlertingV2PublicStart {
  CreateRuleOptionsFlyout: ComponentType<CreateRuleOptionsFlyoutProps>;
  RulesPage: ComponentType<AlertingV2PageProps>;
  RuleLibraryPage: ComponentType<AlertingV2PageProps>;
  EpisodesPage: ComponentType<AlertingV2PageProps>;
  /**
   * Supplies the contexts the alert components need (services, DI container, react-query,
   * host-bound locators, privileges, classic alerts data source) without any page chrome, so a
   * host can embed `EpisodesHistogram`, `EpisodesKpis` or `EpisodesTable` from
   * `@kbn/alerting-v2-episodes-ui` on a page of its own.
   */
  AlertsProvider: ComponentType<AlertingV2AlertsProviderProps>;
  ActionPoliciesPage: ComponentType<AlertingV2PageProps>;
  ExecutionHistoryPage: ComponentType<AlertingV2PageProps>;
  createAlertingV2HostApp: CreateAlertingV2HostApp;
}
