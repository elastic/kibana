/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  ServerEvaluator,
  ServerEvaluatorParams,
  ServerEvaluatorResult,
} from '../evaluator_registry';

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
 * Verifies an ES|QL query parses by asking ES to execute it with a trivially
 * bounded result (LIMIT 0 appended). This returns fast and does not transfer
 * rows. If the query already has a LIMIT, we leave it alone.
 *
 * Falls back to compile-only parsing if the client lacks `.esql.query`.
 */
const verifyQuery = async (
  client: ElasticsearchClient,
  rawQuery: string
): Promise<QueryCheckResult> => {
  const query = /\bLIMIT\s+\d+/i.test(rawQuery) ? rawQuery : `${rawQuery} | LIMIT 0`;

  try {
    // `esql.query` is available on the 8.11+ client. Use transport.request as a
    // fallback to avoid a hard dependency on a specific client surface.
    const esql = (client as unknown as { esql?: { query: (p: unknown) => Promise<unknown> } }).esql;
    if (esql?.query) {
      await esql.query({ query });
    } else {
      await (client as unknown as {
        transport: {
          request: (p: { method: string; path: string; body: unknown }) => Promise<unknown>;
        };
      }).transport.request({
        method: 'POST',
        path: '/_query',
        body: { query },
      });
    }
    return { query: rawQuery, ok: true };
  } catch (err) {
    // ES errors for bad syntax or missing indices come back as ResponseError
    // with the actual message in `.meta.body.error.reason`. We surface the
    // human-readable message and nothing else.
    const message =
      (err as { meta?: { body?: { error?: { reason?: string; type?: string } } } }).meta?.body
        ?.error?.reason ??
      (err as Error).message ??
      String(err);
    return { query: rawQuery, ok: false, error: message };
  }
};

/**
 * `esql-compile` — runs each ES|QL query in the skill against the cluster with
 * `LIMIT 0` and asserts the query parses + the referenced indices/columns
 * exist. Complements the static `esql-pattern` regex evaluator.
 *
 * Requires `params.esClient` to be set (the evaluation_runner wires this in
 * when the suite provides a scoped client). Without an esClient we return
 * `score: null, label: 'skipped'` — the gate logic treats this as
 * non-blocking.
 */
export const esqlCompileEvaluator: ServerEvaluator = {
  name: 'esql-compile',
  kind: 'CODE',
  description:
    'Executes each ES|QL query in the skill with LIMIT 0 to verify it parses and the referenced indices/columns exist.',
  source: 'prebuilt',
  evaluate: async (params: ServerEvaluatorParams): Promise<ServerEvaluatorResult> => {
    const content =
      typeof params.output === 'string' ? params.output : JSON.stringify(params.output ?? '');
    const queries = extractEsqlQueries(content);

    if (queries.length === 0) {
      // No ES|QL to check — neutral pass.
      return {
        evaluator: 'esql-compile',
        kind: 'CODE',
        score: 1.0,
        label: 'pass',
        explanation: 'No ES|QL queries to compile',
      };
    }

    const esClient = params.esClient as ElasticsearchClient | undefined;
    if (!esClient) {
      return {
        evaluator: 'esql-compile',
        kind: 'CODE',
        score: null,
        label: 'skipped',
        explanation: 'No esClient available; ES|QL compile check skipped',
        metadata: { queryCount: queries.length },
      };
    }

    const results = await Promise.all(queries.map((q) => verifyQuery(esClient, q)));
    const failed = results.filter((r) => !r.ok);
    const score = results.length > 0 ? (results.length - failed.length) / results.length : 1.0;

    if (failed.length === 0) {
      return {
        evaluator: 'esql-compile',
        kind: 'CODE',
        score: 1.0,
        label: 'pass',
        explanation: `All ${results.length} ES|QL quer${
          results.length === 1 ? 'y' : 'ies'
        } compiled successfully`,
        metadata: { queryCount: results.length },
      };
    }

    const summary = failed
      .slice(0, 3)
      .map((f) => `"${f.query.slice(0, 60)}${f.query.length > 60 ? '…' : ''}": ${f.error}`)
      .join('; ');

    return {
      evaluator: 'esql-compile',
      kind: 'CODE',
      score,
      label: score >= 0.7 ? 'warn' : 'fail',
      explanation: `${failed.length}/${results.length} ES|QL quer${
        failed.length === 1 ? 'y' : 'ies'
      } failed to compile: ${summary}`,
      metadata: {
        queryCount: results.length,
        failedCount: failed.length,
        failures: failed,
      },
    };
  },
};
