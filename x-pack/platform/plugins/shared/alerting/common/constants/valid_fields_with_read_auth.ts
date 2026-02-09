/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Used by the security solution
 */
export const validFields = {
  EXCEPTIONS_LIST: 'exceptionsList',
  RULE_SOURCE: 'ruleSource',
} as const;

export type ValidReadAuthEditFields = (typeof validFields)[keyof typeof validFields];
