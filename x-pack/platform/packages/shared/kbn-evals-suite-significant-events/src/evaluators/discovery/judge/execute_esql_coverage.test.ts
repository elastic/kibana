/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { executeEsqlCoverageEvaluator } from './execute_esql_coverage';
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

const makeDiscovery = (evidences: Array<{ esql_query?: string | null }>): Partial<Discovery> =>
  ({
    evidences: evidences as Discovery['evidences'],
  } as Partial<Discovery>);

describe('executeEsqlCoverageEvaluator', () => {
  it('returns score null when there are no evidence entries with esql_query', async () => {
    const output = makeOutput({
      inputDiscoveries: [makeDiscovery([])] as Discovery[],
    });

    const result = await executeEsqlCoverageEvaluator.evaluate({
      input: {},
      output,
      expected: {},
      metadata: null,
    });

    expect(result.score).toBeNull();
  });

  it('returns score 0 when toolCallRecords has zero execute_esql calls and discovery has ≥1 evidence entry', async () => {
    const output = makeOutput({
      inputDiscoveries: [
        makeDiscovery([{ esql_query: 'FROM logs | WHERE service.name == "__no_match_____"' }]),
      ] as Discovery[],
      // execute_esql_per_evidence is empty — nothing was called
    });

    const result = await executeEsqlCoverageEvaluator.evaluate({
      input: {},
      output,
      expected: {},
      metadata: null,
    });

    expect(result.score).toBe(0);
  });

  it('returns score 1 when all evidence entries are covered', async () => {
    const query = 'FROM logs | WHERE service.name == "cart"';
    const output = makeOutput({
      inputDiscoveries: [makeDiscovery([{ esql_query: query }])] as Discovery[],
      toolUsage: {
        tool_call_records: [],
        total_calls: 1,
        failures: 0,
        execute_esql_per_evidence: {
          [normalizeWhitespace(query)]: {
            called: true,
            returned_rows: true,
            tool_call_id: 'tc-1',
          },
        },
      },
    });

    const result = await executeEsqlCoverageEvaluator.evaluate({
      input: {},
      output,
      expected: {},
      metadata: null,
    });

    expect(result.score).toBe(1);
  });

  it('returns partial score when only some evidence entries are covered', async () => {
    const q1 = 'FROM logs | WHERE error = true';
    const q2 = 'FROM logs | LIMIT 10';
    const output = makeOutput({
      inputDiscoveries: [makeDiscovery([{ esql_query: q1 }, { esql_query: q2 }])] as Discovery[],
      toolUsage: {
        tool_call_records: [],
        total_calls: 1,
        failures: 0,
        execute_esql_per_evidence: {
          [normalizeWhitespace(q1)]: {
            called: true,
            returned_rows: false,
            tool_call_id: 'tc-1',
          },
          // q2 NOT called
        },
      },
    });

    const result = await executeEsqlCoverageEvaluator.evaluate({
      input: {},
      output,
      expected: {},
      metadata: null,
    });

    expect(result.score).toBe(0.5);
  });
});
