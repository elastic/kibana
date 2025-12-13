/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Constants for data-test-subj values used in rules settings flyout tests
 */
export const RULES_SETTINGS_TEST_SUBJECTS = {
  // Rules List Page
  RULE_PAGE_TAB: 'ruleLogsTab',
  RULES_SETTINGS_LINK: 'rulesSettingsLink',

  // Rules Settings Flyout
  RULES_SETTINGS_FLYOUT: 'rulesSettingsFlyout',
  RULES_SETTINGS_FLYOUT_CANCEL_BUTTON: 'rulesSettingsFlyoutCancelButton',
  RULES_SETTINGS_FLYOUT_SAVE_BUTTON: 'rulesSettingsFlyoutSaveButton',
} as const;

/**
 * Constants for data-test-subj values used in rule type modal tests
 */
export const RULE_TYPE_MODAL_TEST_SUBJECTS = {
  // Rules List Page
  CREATE_RULE_BUTTON: 'createRuleButton',

  // Rule Type Modal
  RULE_TYPE_MODAL: 'ruleTypeModal',
  RULE_TYPE_MODAL_SEARCH: 'ruleTypeModalSearch',
  ALL_RULE_TYPES_BUTTON: 'allRuleTypesButton',
  // Producer filter buttons use pattern: `${producer}-LeftSidebarSelectOption`
  // Rule type cards use pattern: `${ruleTypeId}-SelectOption`
} as const;
