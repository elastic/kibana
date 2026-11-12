/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import type { CreateRuleOptionsFlyoutProps } from './create_rule_options_flyout';
import type { AlertingV2PageProps } from './application/composable_pages';
import type { CreateAlertingV2HostApp } from '../common/locators';

export type { CreateRuleOptionsFlyoutLegacyItem } from './create_rule_options_flyout';
export type { AlertingV2PageProps } from './application/composable_pages';
export type { PrivilegeCheck } from './application/privilege_check_context';

// Structural stand-in for Discover's DataSourceProfileProvider.
// Cannot use the Discover type directly because Discover already depends on alerting_v2
// (optional plugin dep), creating a circular reference.
export interface AlertingV2DiscoverProfileProvider {
  profileId: string;
  profile: {
    getCellRenderers?: (...args: any[]) => (...args: any[]) => Record<string, ComponentType<any>>;

    getDocViewer?: (...args: any[]) => (...args: any[]) => any;
    getDefaultAppState?: () => () => { columns: Array<{ name: string; width?: number }> };

    getColumnsConfiguration?: (...args: any[]) => () => Record<string, (props: any) => any>;

    getRowAdditionalLeadingControls?: (...args: any[]) => (...args: any[]) => any[] | undefined;
  };

  resolve: (
    params: any
  ) => Promise<{ isMatch: true; context: { category: string } } | { isMatch: false }>;
}

export interface AlertingV2PublicStart {
  CreateRuleOptionsFlyout: ComponentType<CreateRuleOptionsFlyoutProps>;
  RulesPage: ComponentType<AlertingV2PageProps>;
  RuleLibraryPage: ComponentType<AlertingV2PageProps>;
  EpisodesPage: ComponentType<AlertingV2PageProps>;
  ActionPoliciesPage: ComponentType<AlertingV2PageProps>;
  ExecutionHistoryPage: ComponentType<AlertingV2PageProps>;
  createAlertingV2HostApp: CreateAlertingV2HostApp;
  createDiscoverProfile: () => AlertingV2DiscoverProfileProvider;
}
