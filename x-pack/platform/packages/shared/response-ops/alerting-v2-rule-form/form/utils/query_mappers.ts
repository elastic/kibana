/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse, Query } from '@kbn/alerting-v2-schemas';
import type { RuleQuery } from '../types';

/** Maps form `RuleQuery` to the API `Query` shape; a blank segment drops `breach`. */
export const ruleQueryToApiQuery = (query: RuleQuery): Query => ({
  base: query.base,
  ...(query.breach.segment.trim() ? { breach: { segment: query.breach.segment } } : {}),
});

/** Maps an API `Query` response back to the form's `RuleQuery`. */
export const apiQueryToFormQuery = (query: RuleResponse['query']): RuleQuery => ({
  base: query.base,
  breach: { segment: query.breach?.segment ?? '' },
});
