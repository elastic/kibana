/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRootEsqlQuery, type RuleResponse } from '@kbn/alerting-v2-schemas';
import type { RuleSnapshot } from './schemas';

export const buildRuleSnapshot = (rule: RuleResponse, spaceId: string): RuleSnapshot => ({
  ruleId: rule.id,
  spaceId,
  name: rule.metadata.name,
  kind: rule.kind,
  query: getRootEsqlQuery(rule.query),
  enabled: rule.enabled,
  tags: rule.metadata.tags ?? [],
});
