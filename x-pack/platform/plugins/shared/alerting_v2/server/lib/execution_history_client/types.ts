/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ListRuleExecutionsQuery, ListRuleExecutionsResponse } from '@kbn/alerting-v2-schemas';

export interface ExecutionHistoryClientContract {
  listRuleExecutions(query: ListRuleExecutionsQuery): Promise<ListRuleExecutionsResponse>;
}
