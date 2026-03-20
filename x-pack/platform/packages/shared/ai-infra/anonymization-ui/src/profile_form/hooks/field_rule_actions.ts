/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const FIELD_RULE_ACTION_ALLOW = 'allow' as const;
export const FIELD_RULE_ACTION_ANONYMIZE = 'anonymize' as const;
export const FIELD_RULE_ACTION_DENY = 'deny' as const;

export type FieldRuleAction =
  | typeof FIELD_RULE_ACTION_ALLOW
  | typeof FIELD_RULE_ACTION_ANONYMIZE
  | typeof FIELD_RULE_ACTION_DENY;
