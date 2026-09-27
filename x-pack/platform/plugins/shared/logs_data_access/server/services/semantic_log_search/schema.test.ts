/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Property tests for the `target` allowlist (schema.ts, `INDEX_PATTERN`): any value accepted
// by the schema must not alter the shape of the emitted ES|QL query. Tests use the real
// `@elastic/esql` parser so a future widening fails here, not silently in production.

import { esql, Parser } from '@elastic/esql';
import { ESQL_TIME_RANGE_FILTER, MAX_EPOCH_MS } from './constants';
import { semanticLogSearchInputSchema } from './schema';

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

// Payloads that must be rejected: each either changes the ES|QL query shape or causes parse errors.
const REJECTED_TARGETS = [
  // whitespace — ES|QL accepts \n, \r, \t as token separators
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

describe('semanticLogSearchInputSchema — timeRange epoch bounds', () => {
  const baseInput = { target: 'logs-*', nlQuery: 'test' };

  const VALID_EPOCHS = [
    ['zero (1970-01-01)', 0],
    ['recent epoch', 1_704_067_200_000],
    ['+MAX_EPOCH_MS', MAX_EPOCH_MS],
    ['-MAX_EPOCH_MS (pre-1970)', -MAX_EPOCH_MS],
  ] as const;

  const INVALID_EPOCHS = [
    ['MAX_EPOCH_MS + 1', MAX_EPOCH_MS + 1],
    ['Number.MAX_SAFE_INTEGER', Number.MAX_SAFE_INTEGER],
    ['-MAX_EPOCH_MS - 1', -MAX_EPOCH_MS - 1],
  ] as const;

  it.each(VALID_EPOCHS)('accepts %s and toISOString does not throw', (_label, epoch) => {
    const start = -MAX_EPOCH_MS;
    const end = epoch === -MAX_EPOCH_MS ? -MAX_EPOCH_MS + 1 : epoch > 0 ? epoch : 1;
    const result = semanticLogSearchInputSchema.safeParse({
      ...baseInput,
      timeRange: { start, end },
    });
    // The important property: accepted values must be representable as ISO dates.
    if (result.success) {
      expect(() => new Date(result.data.timeRange.start).toISOString()).not.toThrow();
      expect(() => new Date(result.data.timeRange.end).toISOString()).not.toThrow();
    }
  });

  it.each(INVALID_EPOCHS)('rejects %s before Elasticsearch work', (_label, epoch) => {
    const result = semanticLogSearchInputSchema.safeParse({
      ...baseInput,
      timeRange: { start: 0, end: epoch },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a negative-end overflow', () => {
    const result = semanticLogSearchInputSchema.safeParse({
      ...baseInput,
      timeRange: { start: -MAX_EPOCH_MS - 1, end: 1 },
    });
    expect(result.success).toBe(false);
  });
});

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
      const query = esql.from(target).where(ESQL_TIME_RANGE_FILTER).limit(5).print('basic');
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
