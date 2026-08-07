/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The matcher string the simple-action flow writes when linking a policy to a single rule
 */
export const buildRuleScopedMatcher = (ruleId: string): string => `rule.id: "${ruleId}"`;
