/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleList } from './components/rule_list';

export { RuleList } from './components/rule_list';
export type { RuleListProps } from './components/rule_list';

export { RuleListProvider, useRuleListServices } from './rule_list_context';
export type { RuleListServices } from './rule_list_context';

export type {
  RuleApiResponse,
  FindRulesResponse,
  BulkOperationParams,
  BulkOperationResponse,
  BulkOperationError,
} from '@kbn/alerting-v2-rule-apis';

// eslint-disable-next-line import/no-default-export
export default RuleList;
