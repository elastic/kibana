/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

export const BIGGER_TIMEOUT = 20000 as const;
export const SHORTER_TIMEOUT = 5000 as const;

// Minimal role for the connector suites: manage connectors (`actions`) and
// rules/stack alerts (`stackAlerts`), plus ES read on the alerts indices and the
// index-threshold test index so the rule form can list its time fields.
export const CONNECTORS_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [
      {
        names: ['.alerts-*', 'scout-threshold-rule-test*'],
        privileges: ['read', 'view_index_metadata'],
      },
      {
        names: ['scout-idx-*'],
        privileges: ['create_index', 'write'],
      },
    ],
  },
  kibana: [
    {
      base: [],
      feature: { actions: ['all'], stackAlerts: ['all'] },
      spaces: ['*'],
    },
  ],
};

export const RULE_DETAILS_APP_PATH = 'management/insightsAndAlerting/triggersActions';
export const CONNECTORS_APP_PATH = '/app/management/insightsAndAlerting/triggersActionsConnectors';
export const MAINTENANCE_WINDOWS_APP_PATH =
  '/app/management/insightsAndAlerting/maintenanceWindows';

// Shared CSS selectors for the connectors list page.
export const CONNECTORS_LIST_SELECTORS = {
  SEARCH_INPUT: '[data-test-subj="actionsList"] .euiFieldSearch',
  TABLE_LOADED: '.euiBasicTable[data-test-subj="actionsTable"]:not(.euiBasicTable-loading)',
  // Shown instead of the table when no connectors exist yet.
  EMPTY_STATE: '[data-test-subj="createFirstConnectorEmptyPrompt"]',
} as const;

export const RULE_DETAILS_TEST_SUBJECTS = {
  RULE_DETAILS_TITLE: 'ruleDetailsTitle',
  RULE_NAME: 'ruleName',
  ALERTS_SEARCH_BAR_ROW: 'ruleDetailsAlertsSearchBarRow',
  ALERTS_TABLE_EMPTY_STATE: 'alertsTableEmptyState',
} as const;
