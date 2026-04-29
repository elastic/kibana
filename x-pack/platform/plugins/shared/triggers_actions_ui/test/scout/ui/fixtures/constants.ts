/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const BIGGER_TIMEOUT = 20000 as const;
export const SHORTER_TIMEOUT = 5000 as const;

export const RULE_DETAILS_APP_PATH = 'management/insightsAndAlerting/triggersActions';

export const RULE_DETAILS_TEST_SUBJECTS = {
  RULE_DETAILS_TITLE: 'ruleDetailsTitle',
  RULE_NAME: 'ruleName',
  ALERTS_SEARCH_BAR_ROW: 'ruleDetailsAlertsSearchBarRow',
  ALERTS_TABLE_EMPTY_STATE: 'alertsTableEmptyState',
} as const;

export const RULES_LIST_TEST_SUBJECTS = {
  APP_TITLE: 'appTitle',
  RULES_LIST: 'rulesList',
  RULES_LIST_SECTION: 'rulesListSection',
  RULES_TABLE_CONTAINER: 'rulesListSection',
  RULES_TABLE: 'rulesList',
  RULE_ROW: 'rule-row',
  RULE_ROW_NON_EDITABLE: 'rule-row-isNotEditable',
  RULE_SEARCH_FIELD: 'ruleSearchField',
  NO_PERMISSION_PROMPT: 'noPermissionPrompt',
  CREATE_RULE_BUTTON: 'createRuleButton',
  RULE_TYPE_MODAL: 'ruleTypeModal',
  RULE_TYPE_MODAL_SEARCH: 'ruleTypeModalSearch',
} as const;

export const RULES_SETTINGS_FLYOUT_TEST_SUBJECTS = {
  RULES_SETTINGS_LINK: 'rulesSettingsLink',
  RULES_SETTINGS_FLYOUT: 'rulesSettingsFlyout',
  RULES_SETTINGS_FLYOUT_CANCEL_BUTTON: 'rulesSettingsFlyoutCancelButton',
  RULES_SETTINGS_FLYOUT_SAVE_BUTTON: 'rulesSettingsFlyoutSaveButton',
  CENTER_SPINNER: 'centerJustifiedSpinner',
  FLAPPING_OFF_PROMPT: 'rulesSettingsFlappingOffPrompt',
  FLAPPING_ENABLE_SWITCH: 'rulesSettingsFlappingEnableSwitch',
  LOOK_BACK_WINDOW_RANGE_INPUT: 'lookBackWindowRangeInput',
  STATUS_CHANGE_THRESHOLD_RANGE_INPUT: 'statusChangeThresholdRangeInput',
  QUERY_DELAY_RANGE_INPUT: 'queryDelayRangeInput',
} as const;
