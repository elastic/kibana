/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import { RULE_ON_RULE_BUCKET_INTERVAL } from './constants';
import type { RuleOnRulePlan } from './types';
import { validateEsqlQueryExecutable } from '@kbn/alerting-v2-plugin/server';

const COUNT_BASED_BUCKET_PATTERN = new RegExp(
  `BUCKET\\s*\\(\\s*@timestamp\\s*,\\s*${escapeRegExp(RULE_ON_RULE_BUCKET_INTERVAL)}\\s*\\)`,
  'i'
);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function validateRuleOnRuleEsqlStructure({
  esql,
  path,
}: {
  esql: string;
  path: RuleOnRulePlan['path'];
}): void {
  if (/\bspace_id\b/i.test(esql)) {
    throw new RuleOnRuleValidationError(
      'Rule-on-rule ES|QL must not filter on space_id; scope with rule.id only'
    );
  }

  if (path === 'count-based' && !COUNT_BASED_BUCKET_PATTERN.test(esql)) {
    throw new RuleOnRuleValidationError(
      `Count-based rule-on-rule ES|QL must use BUCKET(@timestamp, ${RULE_ON_RULE_BUCKET_INTERVAL})`
    );
  }
}

export class RuleOnRuleValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuleOnRuleValidationError';
  }
}

export async function validateRuleOnRulePlan(
  plan: RuleOnRulePlan,
  esClient: IScopedClusterClient
): Promise<void> {
  if (plan.path === 'unsupported') {
    throw new RuleOnRuleValidationError('Planner returned unsupported path');
  }

  if (!plan.rules.length) {
    throw new RuleOnRuleValidationError('Planner returned no rule-on-rule queries');
  }

  for (const entry of plan.rules) {
    if (!entry.esql.includes('CHANGE_POINT')) {
      throw new RuleOnRuleValidationError('Rule-on-rule ES|QL must include CHANGE_POINT');
    }
    if (!entry.esql.includes('WHERE type IS NOT NULL')) {
      throw new RuleOnRuleValidationError('Rule-on-rule ES|QL must filter WHERE type IS NOT NULL');
    }
    if (!entry.esql.includes('FROM .rule-events')) {
      throw new RuleOnRuleValidationError('Rule-on-rule ES|QL must query FROM .rule-events');
    }
    if (/\bdata\.[A-Za-z_][A-Za-z0-9_]*/.test(entry.esql)) {
      throw new RuleOnRuleValidationError(
        'Rule-on-rule ES|QL must use FIELD_EXTRACT(data, "...") instead of data.* dot notation (data is flattened)'
      );
    }

    validateRuleOnRuleEsqlStructure({ esql: entry.esql, path: plan.path });

    await validateEsqlSyntax(esClient, entry.esql);
  }
}

async function validateEsqlSyntax(esClient: IScopedClusterClient, query: string): Promise<void> {
  try {
    await validateEsqlQueryExecutable(esClient.asCurrentUser, query);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new RuleOnRuleValidationError(`Invalid rule-on-rule ES|QL: ${message}`);
  }
}
