/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const RULES_PAGE_TAB_IDS = {
  v1: 'v1Rules',
  v2: 'v2Rules',
} as const;

export type RulesPageTabId = (typeof RULES_PAGE_TAB_IDS)[keyof typeof RULES_PAGE_TAB_IDS];
