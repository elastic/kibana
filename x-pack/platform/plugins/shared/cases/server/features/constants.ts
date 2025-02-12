/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Unique sub privilege ids for cases.
 * @description When upgrading (creating new versions), the sub-privileges
 * do not need to be versioned as they are appended to the top level privilege id which is the only id
 * that will need to be versioned
 */

export const CASES_DELETE_SUB_PRIVILEGE_ID = 'cases_delete';
export const CASES_SETTINGS_SUB_PRIVILEGE_ID = 'cases_settings';
export const CASES_CREATE_COMMENT_SUB_PRIVILEGE_ID = 'create_comment';
export const CASES_REOPEN_SUB_PRIVILEGE_ID = 'case_reopen';
export const CASES_ASSIGN_SUB_PRIVILEGE_ID = 'cases_assign';
