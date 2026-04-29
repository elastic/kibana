/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const BIGGER_TIMEOUT = 20000 as const;
export const SHORTER_TIMEOUT = 5000 as const;

export const RULE_DETAILS_APP_PATH = 'management/insightsAndAlerting/triggersActions';
export const CONNECTORS_APP_PATH = '/app/management/insightsAndAlerting/triggersActionsConnectors';

// Shared CSS selectors for the connectors list page. These couple to EUI's
// internal class names; if the EUI version changes them, update here once.
// Ideally the source component would expose dynamic data-test-subj attributes
// (e.g. `actionsTable-loaded`) so we could drop the `:not(.euiBasicTable-loading)`
// trick — file a ticket if this becomes a maintenance burden.
export const CONNECTORS_LIST_SELECTORS = {
  SEARCH_INPUT: '[data-test-subj="actionsList"] .euiFieldSearch',
  TABLE_LOADED: '.euiBasicTable[data-test-subj="actionsTable"]:not(.euiBasicTable-loading)',
} as const;

export const RULE_DETAILS_TEST_SUBJECTS = {
  RULE_DETAILS_TITLE: 'ruleDetailsTitle',
  RULE_NAME: 'ruleName',
  ALERTS_SEARCH_BAR_ROW: 'ruleDetailsAlertsSearchBarRow',
  ALERTS_TABLE_EMPTY_STATE: 'alertsTableEmptyState',
} as const;
