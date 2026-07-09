/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CONNECTORS_APP_PATH = 'management/insightsAndAlerting/triggersActionsConnectors';

export const TIMEOUT = 10000 as const;

export const CONNECTORS_LIST_SELECTORS = {
  TABLE_LOADED: '.euiBasicTable[data-test-subj="actionsTable"]',
  SEARCH_INPUT: '[data-test-subj="actionsList"] .euiFieldSearch',
} as const;
