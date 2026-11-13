/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { EvaluatorDefinition } from '../types';
import { collectRoundText } from '../round_text';

const ESQL_BLOCK_PATTERN = /```(?:esql|ES\|QL|esql-query)\s*\n([\s\S]*?)```/gi;
// Inline ES|QL: starts with FROM, ends at blank line or end of input.
const INLINE_ESQL_PATTERN = /\bFROM\s+[\w.*,\s-]+\|[\s\S]*?(?=\n\n|$)/gi;

const extractEsqlQueries = (content: string): string[] => {
  const queries = new Set<string>();

  ESQL_BLOCK_PATTERN.lastIndex = 0;
  let m = ESQL_BLOCK_PATTERN.exec(content);
  while (m) {
    const q = m[1].trim();
    if (q) queries.add(q);
    m = ESQL_BLOCK_PATTERN.exec(content);
  }

  INLINE_ESQL_PATTERN.lastIndex = 0;
  m = INLINE_ESQL_PATTERN.exec(content);
  while (m) {
    const q = m[0].trim();
    if (q) queries.add(q);
    m = INLINE_ESQL_PATTERN.exec(content);
  }

  return Array.from(queries);
};

interface QueryCheckResult {
  query: string;
  ok: boolean;
  error?: string;
}

/**
 * Verifies an ES|QL query parses by asking ES to execute it with LIMIT 0
 * appended. A trailing LIMIT 0 is valid after any earlier LIMIT, so it is
 * always appended and no rows are transferred.
 */
const verifyQuery = async (
  esClient: ElasticsearchClient,
  rawQuery: string
): Promise<QueryCheckResult> => {
  // On its own line so a trailing `//` comment cannot swallow it.
  const query = `${rawQuery}\n| LIMIT 0`;

  try {
    await (
      esClient as unknown as {
        transport: {
          request: (p: { method: string; path: string; body: unknown }) => Promise<unknown>;
        };
      }
    ).transport.request({
      method: 'POST',
      path: '/_query',
      body: { query },
    });
    return { query: rawQuery, ok: true };
  } catch (err) {
    // ES errors for bad syntax or missing indices come back as ResponseError
    // with the human-readable message in `.meta.body.error.reason`.
    const message =
      (err as { meta?: { body?: { error?: { reason?: string } } } }).meta?.body?.error?.reason ??
      (err as Error).message ??
      String(err);
    return { query: rawQuery, ok: false, error: message };
  }
};

const plural = (count: number, singular: string, pluralForm: string): string =>
  count === 1 ? singular : pluralForm;

export const esqlCompileEvaluator: EvaluatorDefinition = {
  name: 'esql-compile',
  version: '1.0.0',
  kind: 'code',
  origin: 'built_in',
  direction: 'maximize',
  description:
    'Executes each ES|QL query in the round output with LIMIT 0 to verify it parses and the referenced indices/columns exist.',
  async evaluate({ round, trace }) {
    const content = collectRoundText(round);
    const queries = extractEsqlQueries(content);

    if (queries.length === 0) {
      return {
        scores: [
          {
            name: 'esql-compile',
            score: 1.0,
            label: 'pass',
            explanation: 'No ES|QL queries to compile',
          },
        ],
      };
    }

    if (!trace) {
      return { scores: [], notApplicable: { reason: 'No Elasticsearch access without a trace' } };
    }

    const results = await Promise.all(queries.map((q) => verifyQuery(trace.esClient, q)));
    const failed = results.filter((r) => !r.ok);
    const score = (results.length - failed.length) / results.length;

    if (failed.length === 0) {
      return {
        scores: [
          {
            name: 'esql-compile',
            score: 1.0,
            label: 'pass',
            explanation: `All ${results.length} ES|QL ${plural(
              results.length,
              'query',
              'queries'
            )} compiled successfully`,
            metadata: { queryCount: results.length },
          },
        ],
      };
    }

    const summary = failed
      .slice(0, 3)
      .map((f) => `"${f.query.slice(0, 60)}${f.query.length > 60 ? '…' : ''}": ${f.error}`)
      .join('; ');

    return {
      scores: [
        {
          name: 'esql-compile',
          score,
          label: score >= 0.7 ? 'warn' : 'fail',
          explanation: `${failed.length}/${results.length} ES|QL ${plural(
            failed.length,
            'query',
            'queries'
          )} failed to compile: ${summary}`,
          metadata: {
            queryCount: results.length,
            failedCount: failed.length,
            failures: failed,
          },
        },
      ],
    };
  },
};
