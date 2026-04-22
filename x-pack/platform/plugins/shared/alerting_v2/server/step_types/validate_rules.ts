/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { validateRulesCommonDefinition } from '../../common/step_types/validate_rules';

interface Column {
  name: string;
  type: string;
}

const FROM_PATTERN = /FROM\s+([^\s|]+)/i;

function extractIndexPattern(query: string): string | null {
  const match = query.match(FROM_PATTERN);
  return match ? match[1] : null;
}

function getNestedString(obj: Record<string, unknown>, path: string): string | null {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return null;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : null;
}

function getNestedArray(obj: Record<string, unknown>, path: string): string[] | null {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return null;
    current = (current as Record<string, unknown>)[part];
  }
  return Array.isArray(current) ? (current as string[]) : null;
}

async function validateQuery(
  esClient: ElasticsearchClient,
  query: string
): Promise<{ valid: boolean; error?: string; columns?: Column[] }> {
  try {
    const response = await esClient.esql.query({ query: `${query} | LIMIT 0`, format: 'json' });
    const columns = (response as { columns?: Column[] }).columns;
    return { valid: true, columns: columns ?? [] };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown ES|QL validation error';
    return { valid: false, error: errorMessage };
  }
}

export const validateRulesStepDefinition = createServerStepDefinition({
  ...validateRulesCommonDefinition,
  handler: async (context) => {
    const esClient = context.contextManager.getScopedEsClient();
    const { rules } = context.input;

    type RuleEntry = { id: string; rule: Record<string, unknown> };

    const validRules: RuleEntry[] = [];
    const invalidRules: RuleEntry[] = [];
    const validationReport: Array<{ id: string; valid: boolean; errors?: string[] }> = [];
    const indexPatternsToResolve = new Set<string>();
    const resolvedSchemas = new Map<string, Column[]>();

    for (const entry of rules) {
      const { id, rule } = entry;
      const errors: string[] = [];

      const baseQuery = getNestedString(rule, 'evaluation.query.base');
      let baseColumns: Column[] = [];

      if (baseQuery) {
        const result = await validateQuery(esClient, baseQuery);
        if (!result.valid) {
          errors.push(`evaluation.query.base: ${result.error}`);
          const pattern = extractIndexPattern(baseQuery);
          if (pattern) indexPatternsToResolve.add(pattern);
        } else {
          baseColumns = result.columns ?? [];
        }
      }

      const recoveryQuery = getNestedString(rule, 'recovery_policy.query.base');
      if (recoveryQuery) {
        const result = await validateQuery(esClient, recoveryQuery);
        if (!result.valid) {
          errors.push(`recovery_policy.query.base: ${result.error}`);
          const pattern = extractIndexPattern(recoveryQuery);
          if (pattern) indexPatternsToResolve.add(pattern);
        }
      }

      const groupingFields = getNestedArray(rule, 'grouping.fields');
      if (groupingFields && groupingFields.length > 0 && baseColumns.length > 0) {
        const columnNames = new Set(baseColumns.map((c) => c.name));
        for (const field of groupingFields) {
          if (!columnNames.has(field)) {
            errors.push(
              `grouping.fields: field "${field}" not found in query output columns`
            );
          }
        }
      }

      if (errors.length > 0) {
        context.logger.warn(`Rule validation failed for ${id}: ${errors.join('; ')}`);
        invalidRules.push({ ...entry, rule: { ...rule, _validationErrors: errors } });
        validationReport.push({ id, valid: false, errors });
      } else {
        validRules.push(entry);
        validationReport.push({ id, valid: true });
      }
    }

    const fieldSchemas: Record<string, Column[]> = {};

    for (const pattern of indexPatternsToResolve) {
      if (resolvedSchemas.has(pattern)) {
        fieldSchemas[pattern] = resolvedSchemas.get(pattern)!;
        continue;
      }
      try {
        const schemaResponse = await esClient.esql.query({
          query: `FROM ${pattern} | LIMIT 0`,
          format: 'json',
        });
        const columns = (schemaResponse as { columns?: Column[] }).columns;
        if (columns && columns.length > 0 && columns[0].name !== '<no-fields>') {
          fieldSchemas[pattern] = columns;
          resolvedSchemas.set(pattern, columns);
        }
      } catch {
        context.logger.debug(`Could not resolve schema for index pattern: ${pattern}`);
      }
    }

    const hasInvalid = invalidRules.length > 0;

    context.logger.info(
      `Rule validation: ${validRules.length} valid, ${invalidRules.length} invalid out of ${rules.length} rules`
    );

    return {
      output: { validRules, invalidRules, fieldSchemas, hasInvalid, validationReport },
    };
  },
});
