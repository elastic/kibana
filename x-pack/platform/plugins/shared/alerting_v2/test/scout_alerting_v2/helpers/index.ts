/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { SCOUT_DEFAULT_RULE_EVALUATION_QUERY, SCOUT_DEFAULT_RULE_SCHEDULE } from './constants';

export { createRule, deleteRule, deleteRules, disableRules, enableRules } from './rules_api';

export type { CreateRuleOptions } from './rules_api';
