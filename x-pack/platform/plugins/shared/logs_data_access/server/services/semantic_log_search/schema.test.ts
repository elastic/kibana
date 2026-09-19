/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Parser-pinned property tests for the `target` allowlist in schema.ts.
 *
 * The allowlist (`INDEX_PATTERN = /^[a-zA-Z0-9_.,:*+-]+$/`) was derived from the ES|QL lexer's
 * `UNQUOTED_SOURCE_PART` grammar fragment. These tests assert the property the rule is supposed
 * to guarantee — not that particular characters are blocked, but that anything the schema accepts
 * cannot change the shape of the emitted ES|QL query.
 *
 * They use `Parser.parse` from `@elastic/esql` (the same parser Elasticsearch uses) so the
 * assertion is structural: if the schema passes a target and the parser then sees extra commands,
 * extra sources, or parse errors, the test fails immediately — a future change that widens the
 * allowlist will cause a test failure rather than silently reopening the injection hole.
 */

import { esql, Parser } from '@elastic/esql';
import { ESQL_TIME_RANGE_FILTER } from './constants';
import { semanticLogSearchInputSchema } from './schema';

// Every entry here must also appear in the positive acceptance table in service.test.ts.
const ACCEPTED_TARGETS = [
  'logs-*',
  'my_index',
  '.ds-logs-2024.01.01-000001',
  'logs-generic-default',
  'metrics-*-*',
  '*',
  'idx+1',
  'logs-*,filebeat-*',
  'remote:logs-*',
  'cluster-a:logs-*,cluster-b:logs-*',
  'logs-*::data',
  'logs-*,-logs-debug-*',
] as const;

// Payloads that bypass the old denylist but must be rejected by the new allowlist.
// Each one produces valid ES|QL with ≥1 parse errors OR changes the query shape when
// passed through esql.from() — which is why the rule must block them.
const REJECTED_TARGETS = [
  // whitespace bypass (old denylist only checked U+0020)
  'logs-*\nMETADATA\n_id',
  'logs-*\rMETADATA\r_id',
  'logs-*\tMETADATA\t_id',
  // backtick is the ES|QL identifier quote — `logs-*` emits a quoted source
  '`logs-*`',
  // pipe is the command separator — most direct injection vector
  'logs-* | DROP message',
  // backslash
  'logs\\sneaky',
] as const;

describe('semanticLogSearchInputSchema — target allowlist', () => {
  describe('parser invariant: accepted targets cannot change the FROM clause shape', () => {
    it.each(ACCEPTED_TARGETS)('keeps %s inside the FROM clause', (target) => {
      // First: confirm the schema accepts the target.
      const result = semanticLogSearchInputSchema.safeParse({
        target,
        nlQuery: 'test',
        timeRange: { start: 0, end: 1 },
      });
      expect(result.success).toBe(true);

      // Second: emit the query and parse it with the real ES|QL parser.
      // The emitted query has exactly three commands: FROM, WHERE, LIMIT.
      // The FROM command must have exactly as many source arguments as the target has
      // comma-separated parts — no injected METADATA options, no extra sources.
      const query = esql
        .from(target)
        .where(ESQL_TIME_RANGE_FILTER)
        .limit(5)
        .print('basic');
      const { root, errors } = Parser.parse(query);

      expect(errors).toHaveLength(0);
      expect(root.commands).toHaveLength(3); // FROM, WHERE, LIMIT
      // Each comma-separated part is one source argument in the FROM clause.
      expect(root.commands[0].args).toHaveLength(target.split(',').length);
    });
  });

  describe('schema rejects injection payloads', () => {
    it.each(REJECTED_TARGETS)('rejects %s', (target) => {
      const result = semanticLogSearchInputSchema.safeParse({
        target,
        nlQuery: 'test',
        timeRange: { start: 0, end: 1 },
      });
      expect(result.success).toBe(false);
    });
  });
});
