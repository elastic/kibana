/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_VIEW_PAGE_TABS } from '../types';

/**
 * Application
 */

export const APP_ID = 'cases' as const;
/** @deprecated Please use FEATURE_ID_V3 instead */
export const FEATURE_ID = 'generalCases' as const;
/** @deprecated Please use FEATURE_ID_V3 instead */
export const FEATURE_ID_V2 = 'generalCasesV2' as const;
export const FEATURE_ID_V3 = 'generalCasesV3' as const;
export const APP_OWNER = 'cases' as const;
export const APP_PATH = '/app/management/insightsAndAlerting/cases' as const;
export const CASES_CREATE_PATH = '/create' as const;
export const CASES_CONFIGURE_PATH = '/configure' as const;
export const CASE_VIEW_PATH = '/:detailName' as const;
export const CASE_VIEW_COMMENT_PATH = `${CASE_VIEW_PATH}/:commentId` as const;
export const CASE_VIEW_ALERT_TABLE_PATH =
  `${CASE_VIEW_PATH}/?tabId=${CASE_VIEW_PAGE_TABS.ALERTS}` as const;
export const CASE_VIEW_TAB_PATH = `${CASE_VIEW_PATH}/?tabId=:tabId` as const;

/**
 * The main Cases application is in the stack management under the
 * Alerts and Insights section. To do that, Cases registers to the management
 * application. This constant holds the application ID of the management plugin
 */
export const STACK_APP_ID = 'management' as const;
