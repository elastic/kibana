/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import type { CreateRuleData } from '@kbn/alerting-v2-schemas';
import type { ClassicRule, CreatedRuleMigration, RuleMigration } from './migration/types';
import type { CreateRuleOptionsFlyoutProps } from './create_rule_options_flyout';
import type { CreateRuleFlyoutProps } from './create_rule_flyout';
import type { AlertingV2PageProps } from './application/composable_pages';
import type { CreateAlertingV2HostApp } from '../common/locators';

export type { CreateRuleOptionsFlyoutLegacyItem } from './create_rule_options_flyout';
export type { AlertingV2PageProps } from './application/composable_pages';
export type { PrivilegeCheck } from './application/privilege_check_context';

/** A v2 rule payload converted from a classic rule. */
export type MigratedRule = CreateRuleData;

export type {
  ActionMigrationNote,
  ClassicRuleAction,
  CreatedRuleMigration,
  MigratedActionPolicy,
  RuleMigration,
  SkippedClassicAction,
} from './migration/types';

export interface AlertingV2PublicStart {
  CreateRuleOptionsFlyout: ComponentType<CreateRuleOptionsFlyoutProps>;
  CreateRuleFlyout: ComponentType<CreateRuleFlyoutProps>;
  /**
   * Converts a classic rule to a v2 rule and simple action policies; resolves `undefined`
   * when its type has no converter.
   */
  migrateRule: (rule: ClassicRule) => Promise<RuleMigration | undefined>;
  /** Creates the migrated rule and the action policies that are ready to create. */
  createMigratedRule: (migration: RuleMigration) => Promise<CreatedRuleMigration>;
  RulesPage: ComponentType<AlertingV2PageProps>;
  RuleLibraryPage: ComponentType<AlertingV2PageProps>;
  EpisodesPage: ComponentType<AlertingV2PageProps>;
  ActionPoliciesPage: ComponentType<AlertingV2PageProps>;
  ExecutionHistoryPage: ComponentType<AlertingV2PageProps>;
  createAlertingV2HostApp: CreateAlertingV2HostApp;
}
