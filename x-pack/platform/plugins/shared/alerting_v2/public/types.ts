/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import type { ClassicRuleSummaryFlyoutProps } from './classic_rule_summary_flyout';
import type { CreateRuleOptionsFlyoutProps } from './create_rule_options_flyout';
import type { RuleSummaryFlyoutEntryProps } from './rule_summary_flyout_entry';
import type { AlertingV2PageProps } from './application/composable_pages';
import type { CreateAlertingV2HostApp } from './locator_host';

export type { CreateRuleOptionsFlyoutLegacyItem } from './create_rule_options_flyout';
export type { AlertingV2PageProps } from './application/composable_pages';
export type { PrivilegeCheck } from './application/privilege_check_context';
export type { ClassicRuleSummaryFlyoutProps } from './classic_rule_summary_flyout';
export type { RuleSummaryFlyoutEntryProps } from './rule_summary_flyout_entry';

export interface AlertingV2PublicStart {
  CreateRuleOptionsFlyout: ComponentType<CreateRuleOptionsFlyoutProps>;
  ClassicRuleSummaryFlyout: ComponentType<ClassicRuleSummaryFlyoutProps>;
  /** Host-facing Universal (v2) rule summary flyout (list expand). */
  RuleSummaryFlyout: ComponentType<RuleSummaryFlyoutEntryProps>;
  RulesPage: ComponentType<AlertingV2PageProps>;
  RuleLibraryPage: ComponentType<AlertingV2PageProps>;
  EpisodesPage: ComponentType<AlertingV2PageProps>;
  ActionPoliciesPage: ComponentType<AlertingV2PageProps>;
  ExecutionHistoryPage: ComponentType<AlertingV2PageProps>;
  createAlertingV2HostApp: CreateAlertingV2HostApp;
}
