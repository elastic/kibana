/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';

const VALID_ESQL_COMMANDS = [
  'FROM',
  'WHERE',
  'STATS',
  'EVAL',
  'SORT',
  'LIMIT',
  'KEEP',
  'DROP',
  'RENAME',
  'DISSECT',
  'GROK',
  'ENRICH',
  'ROW',
  'SHOW',
  'META',
  'MV_EXPAND',
];

const ESQL_BLOCK_PATTERN = /```(?:esql|ES\|QL)?\s*\n([\s\S]*?)```/gi;
const INLINE_ESQL_PATTERN = /\bFROM\s+[\w.*-]+(?:\s*,\s*[\w.*-]+)*\s*(?:\|[\s\S]*?)(?=\n\n|$)/gi;

interface EsqlIssue {
  query: string;
  issue: string;
  severity: 'error' | 'warning';
}

const extractEsqlQueries = (content: string): string[] => {
  const queries: string[] = [];

  // Extract from code blocks
  ESQL_BLOCK_PATTERN.lastIndex = 0;
  let match = ESQL_BLOCK_PATTERN.exec(content);
  while (match) {
    queries.push(match[1].trim());
    match = ESQL_BLOCK_PATTERN.exec(content);
  }

  // Extract inline ES|QL (FROM ... | ...)
  INLINE_ESQL_PATTERN.lastIndex = 0;
  match = INLINE_ESQL_PATTERN.exec(content);
  while (match) {
    const query = match[0].trim();
    // Avoid duplicates from code blocks
    if (!queries.some((q) => q.includes(query) || query.includes(q))) {
      queries.push(query);
    }
    match = INLINE_ESQL_PATTERN.exec(content);
  }

  return queries;
};

const validateEsqlQuery = (query: string): EsqlIssue[] => {
  const issues: EsqlIssue[] = [];
  const lines = query
    .split('|')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return issues;
  }

  // Check first command is FROM, ROW, SHOW, or META
  const firstCommand = lines[0].split(/\s+/)[0]?.toUpperCase();
  if (!['FROM', 'ROW', 'SHOW', 'META'].includes(firstCommand ?? '')) {
    issues.push({
      query,
      issue: `ES|QL query should start with FROM, ROW, SHOW, or META — found "${firstCommand}"`,
      severity: 'error',
    });
  }

  // Check for unknown commands
  for (const line of lines) {
    const command = line.split(/\s+/)[0]?.toUpperCase();
    if (command && !VALID_ESQL_COMMANDS.includes(command)) {
      issues.push({
        query,
        issue: `Unknown ES|QL command: "${command}"`,
        severity: 'warning',
      });
    }
  }

  // Check for unbounded queries (FROM without WHERE or LIMIT)
  if (firstCommand === 'FROM') {
    const hasWhere = lines.some((l) => l.trim().toUpperCase().startsWith('WHERE'));
    const hasLimit = lines.some((l) => l.trim().toUpperCase().startsWith('LIMIT'));

    if (!hasWhere && !hasLimit) {
      issues.push({
        query,
        issue: 'Unbounded query: FROM without WHERE or LIMIT may return excessive data',
        severity: 'warning',
      });
    }
  }

  // Check for empty STATS (STATS without BY or aggregation)
  for (const line of lines) {
    if (line.toUpperCase().startsWith('STATS') && line.trim().toUpperCase() === 'STATS') {
      issues.push({
        query,
        issue: 'Empty STATS command — needs aggregation expression',
        severity: 'error',
      });
    }
  }

  return issues;
};

export const createEsqlPatternEvaluator = (): Evaluator => ({
  name: 'esql-pattern',
  kind: 'CODE',
  evaluate: async ({ output }) => {
    const content = typeof output === 'string' ? output : JSON.stringify(output);
    const queries = extractEsqlQueries(content);

    if (queries.length === 0) {
      return {
        score: 1.0,
        label: 'pass',
        explanation: 'No ES|QL queries found to validate',
        metadata: { queryCount: 0 },
      };
    }

    const allIssues: EsqlIssue[] = [];
    for (const query of queries) {
      allIssues.push(...validateEsqlQuery(query));
    }

    const errors = allIssues.filter((i) => i.severity === 'error');
    const warnings = allIssues.filter((i) => i.severity === 'warning');

    if (errors.length === 0 && warnings.length === 0) {
      return {
        score: 1.0,
        label: 'pass',
        explanation: `All ${queries.length} ES|QL queries passed validation`,
        metadata: { queryCount: queries.length },
      };
    }

    // Score: deduct 0.3 per error, 0.1 per warning, floor at 0
    const deduction = errors.length * 0.3 + warnings.length * 0.1;
    const score = Math.max(0, 1.0 - deduction);

    const explanationParts: string[] = [];
    if (errors.length > 0) {
      explanationParts.push(`${errors.length} error(s): ${errors.map((e) => e.issue).join('; ')}`);
    }
    if (warnings.length > 0) {
      explanationParts.push(
        `${warnings.length} warning(s): ${warnings.map((w) => w.issue).join('; ')}`
      );
    }

    return {
      score,
      label: errors.length > 0 ? 'fail' : 'warn',
      explanation: `Validated ${queries.length} ES|QL queries: ${explanationParts.join('. ')}`,
      metadata: { queryCount: queries.length, errors, warnings },
    };
  },
});
