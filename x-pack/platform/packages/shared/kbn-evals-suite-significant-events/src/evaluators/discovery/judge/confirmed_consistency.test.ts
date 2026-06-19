/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { confirmedConsistencyEvaluator } from './confirmed_consistency';
import type { JudgeOutput } from '../types';
import type { Discovery } from '@kbn/streams-schema';
import { normalizeWhitespace } from '../../common/matches_evidence_text';

const makeOutput = (overrides: Partial<JudgeOutput> = {}): JudgeOutput => ({
  significantEvents: [],
  inputDiscoveries: [],
  toolUsage: {
    tool_call_records: [],
    total_calls: 0,
    failures: 0,
    execute_esql_per_evidence: {},
  },
  ...overrides,
});

const makeDiscovery = (
  evidences: Array<{ esql_query?: string | null; confirmed?: boolean }>
): Partial<Discovery> =>
  ({
    evidences: evidences as Discovery['evidences'],
  } as Partial<Discovery>);

describe('confirmedConsistencyEvaluator', () => {
  it('returns score 1 when there are no confirmed:true entries', async () => {
    const output = makeOutput({
      inputDiscoveries: [
        makeDiscovery([{ esql_query: 'FROM logs', confirmed: false }]),
      ] as Discovery[],
    });

    const result = await confirmedConsistencyEvaluator.evaluate({
      input: {},
      output,
      expected: {},
      metadata: null,
    });

    expect(result.score).toBe(1);
  });

  it('returns score 0 when evidence has confirmed:true but no corresponding execute_esql returned rows', async () => {
    const query = 'FROM logs | WHERE service.name == "__no_match_____"';
    const normalizedKey = normalizeWhitespace(query);

    const output = makeOutput({
      inputDiscoveries: [makeDiscovery([{ esql_query: query, confirmed: true }])] as Discovery[],
      toolUsage: {
        tool_call_records: [],
        total_calls: 1,
        failures: 0,
        execute_esql_per_evidence: {
          [normalizedKey]: {
            called: true,
            returned_rows: false, // no rows — inconsistent with confirmed:true
            tool_call_id: 'tc-1',
          },
        },
      },
    });

    const result = await confirmedConsistencyEvaluator.evaluate({
      input: {},
      output,
      expected: {},
      metadata: null,
    });

    expect(result.score).toBe(0);
  });

  it('returns score 1 when all confirmed:true entries have returned_rows:true', async () => {
    const query = 'FROM logs | WHERE error = true';
    const normalizedKey = normalizeWhitespace(query);

    const output = makeOutput({
      inputDiscoveries: [makeDiscovery([{ esql_query: query, confirmed: true }])] as Discovery[],
      toolUsage: {
        tool_call_records: [],
        total_calls: 1,
        failures: 0,
        execute_esql_per_evidence: {
          [normalizedKey]: {
            called: true,
            returned_rows: true,
            tool_call_id: 'tc-1',
          },
        },
      },
    });

    const result = await confirmedConsistencyEvaluator.evaluate({
      input: {},
      output,
      expected: {},
      metadata: null,
    });

    expect(result.score).toBe(1);
  });

  it('returns partial score when some confirmed:true entries lack returned_rows', async () => {
    const q1 = 'FROM logs | WHERE error = true';
    const q2 = 'FROM logs | WHERE service.name == "payment"';
    const norm1 = normalizeWhitespace(q1);
    const norm2 = normalizeWhitespace(q2);

    const output = makeOutput({
      inputDiscoveries: [
        makeDiscovery([
          { esql_query: q1, confirmed: true },
          { esql_query: q2, confirmed: true },
        ]),
      ] as Discovery[],
      toolUsage: {
        tool_call_records: [],
        total_calls: 2,
        failures: 0,
        execute_esql_per_evidence: {
          [norm1]: { called: true, returned_rows: true, tool_call_id: 'tc-1' },
          [norm2]: { called: true, returned_rows: false, tool_call_id: 'tc-2' },
        },
      },
    });

    const result = await confirmedConsistencyEvaluator.evaluate({
      input: {},
      output,
      expected: {},
      metadata: null,
    });

    expect(result.score).toBe(0.5);
  });
});
