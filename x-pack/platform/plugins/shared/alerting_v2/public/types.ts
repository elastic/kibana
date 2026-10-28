/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import type { CreateRuleData } from '@kbn/alerting-v2-schemas';
import type {
  ClassicRule,
  MigratedActionPolicy,
  RuleMigration,
  RuleMigrationDefinition,
} from './migration/types';
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
  ConvertRuleParams,
  DefaultActionPolicy,
  MigratedActionPolicy,
  RuleMigrationDefinition,
  RuleParamsConversion,
  RuleTypeMigration,
  RuleMigration,
  SkippedClassicAction,
} from './migration/types';

export interface AlertingV2PublicSetup {
  ruleMigrations: {
    /** Makes a classic rule type migratable to v2; throws when the type is already registered. */
    register: (definition: RuleMigrationDefinition) => void;
  };
}

export interface AlertingV2PublicStart {
  CreateRuleOptionsFlyout: ComponentType<CreateRuleOptionsFlyoutProps>;
  CreateRuleFlyout: ComponentType<CreateRuleFlyoutProps>;
  /** Whether the rule type has a registered migration. */
  canMigrateRule: (ruleTypeId: string) => boolean;
  /**
   * Converts a classic rule to a v2 rule and simple action policies; resolves `undefined`
   * when its type has no registered migration.
   */
  migrateRule: (rule: ClassicRule) => Promise<RuleMigration | undefined>;
  /** Creates the migrated rule and resolves its id. */
  createMigratedRule: (rule: MigratedRule) => Promise<string>;
  /** Creates a workflow and action policy for each converted action that is ready; resolves their ids. */
  createMigratedActionPolicies: (actionPolicies: MigratedActionPolicy[]) => Promise<string[]>;
  /** Whether a converted action has everything it needs to be created. */
  isMigratedActionPolicyReady: (actionPolicy: MigratedActionPolicy) => boolean;
  RulesPage: ComponentType<AlertingV2PageProps>;
  RuleLibraryPage: ComponentType<AlertingV2PageProps>;
  EpisodesPage: ComponentType<AlertingV2PageProps>;
  ActionPoliciesPage: ComponentType<AlertingV2PageProps>;
  ExecutionHistoryPage: ComponentType<AlertingV2PageProps>;
  createAlertingV2HostApp: CreateAlertingV2HostApp;
}
