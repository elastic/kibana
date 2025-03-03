/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const APP_UI_ID = '[managementUI]' as const;

export const RULE_USER_ACTIONS = {
  SELECT: `${APP_UI_ID} ruleType select`,
  SAVE: `${APP_UI_ID} rule save`,
};

// export const BULK_RULE_ACTIONS = {
//   ENABLE: `${APP_UI_ID} bulkRuleActions enable`,
//   DISABLE: `${APP_UI_ID} bulkRuleActions disable`,
//   DUPLICATE: `${APP_UI_ID} bulkRuleActions duplicate`,
//   EXPORT: `${APP_UI_ID} bulkRuleActions export`,
//   MANUAL_RULE_RUN: `${APP_UI_ID} bulkRuleActions manual rule run`,
//   DELETE: `${APP_UI_ID} bulkRuleActions delete`,
//   EDIT: `${APP_UI_ID} bulkRuleActions edit`,
// };

export const RULES_TABLE_FILTERS = {
  SEARCH: `${APP_UI_ID} rulesTableFilters search`,
  STATUS: `${APP_UI_ID} rulesTableFilters status`,
  EXECUTION_STATUS: `${APP_UI_ID} rulesTableFilters executionStatus`,
  TYPE: `${APP_UI_ID} rulesTableFilters type`,
  ACTION_TYPE: `${APP_UI_ID} rulesTableFilters actionType`,
  TAGS: `${APP_UI_ID} rulesTableFilters tags`,
  LAST_RESPONSE: `${APP_UI_ID} rulesTableFilters lastResponse`,
  REFRESH: `${APP_UI_ID} rulesTableFilters refresh`,
};

export const RULES_LIST_ACTIONS = {
  CREATE: `${APP_UI_ID} rulesListActions create`,
  EDIT: `${APP_UI_ID} rulesListActions edit`,
  CLONE: `${APP_UI_ID} rulesListActions clone`,
  SNOOZE: `${APP_UI_ID} rulesListActions snooze`,
  UNSNOOZE: `${APP_UI_ID} rulesListActions unsnooze`,
  DELETE: `${APP_UI_ID} rulesListActions delete`,
  ENABLE: `${APP_UI_ID} rulesListActions enable`,
  DISABLE: `${APP_UI_ID} rulesListActions disable`,
  RUN_RULE: `${APP_UI_ID} rulesListActions runRule`,
  UPDATE_API_KEY: `${APP_UI_ID} rulesListActions updateApiKey`,
};

export const RULES_LIST_BULK_ACTIONS = {
  CREATE: `${APP_UI_ID} rulesListActions create`,
  SNOOZE: `${APP_UI_ID} rulesListActions snooze`,
  UNSNOOZE: `${APP_UI_ID} rulesListActions unsnooze`,
  DELETE: `${APP_UI_ID} rulesListBulkActions delete`,
  ENABLE: `${APP_UI_ID} rulesListBulkActions enable`,
  DISABLE: `${APP_UI_ID} rulesListBulkActions disable`,
  UPDATE_API_KEY: `${APP_UI_ID} rulesListBulkActions updateApiKey`,
};
