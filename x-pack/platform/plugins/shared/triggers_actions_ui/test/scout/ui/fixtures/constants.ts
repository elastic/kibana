/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const BIGGER_TIMEOUT = 20000 as const;
export const SHORTER_TIMEOUT = 5000 as const;

/**
 * Constants for data-test-subj values used on the rule details page.
 */
export const RULE_DETAILS_TEST_SUBJECTS = {
  RULE_DETAILS_TITLE: 'ruleDetailsTitle',
  RULE_NAME: 'ruleName',
  RULE_TYPE: 'ruleSummaryRuleType',
  RULE_STATUS_PANEL: 'ruleStatusPanel',
  RULE_DEFINITION: 'ruleSummaryRuleDefinition',

  ALERTS_SEARCH_BAR_ROW: 'ruleDetailsAlertsSearchBarRow',
  ALERTS_TABLE_EMPTY_STATE: 'alertsTableEmptyState',

  // Actions popover
  ACTIONS_BUTTON: 'ruleActionsButton',
  EDIT_RULE_BUTTON: 'openEditRuleFlyoutButton',
  DELETE_RULE_BUTTON: 'deleteRuleButton',

  // Alert summary widget
  ALERT_SUMMARY_WIDGET_COMPACT: 'alertSummaryWidgetCompact',
  ACTIVE_ALERT_COUNT: 'activeAlertCount',
  TOTAL_ALERT_COUNT: 'totalAlertCount',

  // Rule edit form
  RULE_DETAILS_NAME_INPUT: 'ruleDetailsNameInput',
  DASHBOARDS_SELECTOR: 'dashboardsSelector',
} as const;

/**
 * Constants for data-test-subj values used on the rules list page and settings flyout.
 */
export const RULES_SETTINGS_TEST_SUBJECTS = {
  RULE_PAGE_TAB: 'logsTab',
  RULES_SETTINGS_LINK: 'rulesSettingsLink',
  RULES_TABLE_CONTAINER: 'rulesListSection',
  RULES_TABLE: 'rulesList',
  RULE_ROW: 'rule-row',
  RULE_ROW_NON_EDITABLE: 'rule-row-isNotEditable',

  RULES_SETTINGS_FLYOUT: 'rulesSettingsFlyout',
  RULES_SETTINGS_FLYOUT_CANCEL_BUTTON: 'rulesSettingsFlyoutCancelButton',
  RULES_SETTINGS_FLYOUT_SAVE_BUTTON: 'rulesSettingsFlyoutSaveButton',
} as const;

/**
 * Constants for data-test-subj values used on rule list rows.
 */
export const RULE_LIST_TEST_SUBJECTS = {
  RULE_SIDEBAR_EDIT_ACTION: 'ruleSidebarEditAction',
  EDIT_ACTION_HOVER_BUTTON: 'editActionHoverButton',

  // Rule status dropdown
  STATUS_DROPDOWN: 'statusDropdown',
  STATUS_DROPDOWN_DISABLED_ITEM: 'statusDropdownDisabledItem',
  STATUS_DROPDOWN_ENABLED_ITEM: 'statusDropdownEnabledItem',
  RULES_TABLE_CELL_STATUS: 'rulesTableCell-status',

  // Misc
  RULE_SEARCH_FIELD: 'ruleSearchField',
  CONFIRM_MODAL_BUTTON: 'confirmModalConfirmButton',
} as const;

/**
 * Constants for data-test-subj values used in the rule-type modal.
 */
export const RULE_TYPE_MODAL_TEST_SUBJECTS = {
  CREATE_RULE_BUTTON: 'createRuleButton',
  RULE_TYPE_MODAL: 'ruleTypeModal',
  RULE_TYPE_MODAL_SEARCH: 'ruleTypeModalSearch',
  ALL_RULE_TYPES_BUTTON: 'allRuleTypesButton',
} as const;

/**
 * Constants for data-test-subj values used on the rules list logs tab.
 */
export const LOGS_TAB_TEST_SUBJECTS = {
  LOGS_TAB: 'logsTab',
  EVENT_LOG_TABLE: 'ruleEventLogListTable',
  RULE_DETAILS: 'ruleDetailsTitle',
} as const;
