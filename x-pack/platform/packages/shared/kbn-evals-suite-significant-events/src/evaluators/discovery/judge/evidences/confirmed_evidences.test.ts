/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConverseStep } from '@kbn/evals';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { confirmedEvidencesEvaluator } from './confirmed_evidences';

const esqlStep: ConverseStep = {
  type: 'tool_call',
  tool_id: platformCoreTools.executeEsql,
  tool_call_id: 'e1',
  params: { query: 'FROM logs' },
  results: [{ type: 'esql_results', data: { values: [['x']] } }],
};

const evaluate = (significantEvents: unknown, steps: ConverseStep[]) =>
  confirmedEvidencesEvaluator.evaluate({
    input: {
      discoveries: [],
    },
    output: { significantEvents, steps, inputDiscoveries: [] } as never,
    expected: {} as never,
    metadata: null,
  });

describe('confirmedEvidencesEvaluator', () => {
  it('is unavailable when nothing is open', async () => {
    const result = await evaluate([], [esqlStep]);
    expect(result.score).toBeNull();
  });

  it('scores 0 for an open event of any severity with no confirmed signal', async () => {
    const result = await evaluate([{ status: 'open', severity: '40-medium' }], [esqlStep]);
    expect(result.score).toBe(0);
  });

  it('is unavailable when dismissed', async () => {
    const result = await evaluate([{ status: 'dismissed', severity: '20-low' }], [esqlStep]);
    expect(result.score).toBeNull();
  });

  it('scores 1 when an open+critical event has a confirmed signal and execute_esql ran', async () => {
    const events = [
      {
        status: 'open',
        severity: '80-critical',
        signals: [{ type: 'detection', description: 'confirms.', confirmed: true }],
      },
    ];
    expect((await evaluate(events, [esqlStep])).score).toBe(1);
  });

  it('scores 0 when open+critical without a confirmed signal', async () => {
    const events = [
      {
        status: 'open',
        severity: '80-critical',
        signals: [
          {
            type: 'detection',
            description: 'found row.',
            evidence: { result: 'found' },
          },
        ],
      },
    ];
    expect((await evaluate(events, [esqlStep])).score).toBe(0);
  });

  it('scores 0 when open+critical but execute_esql never ran', async () => {
    const events = [
      {
        status: 'open',
        severity: '80-critical',
        signals: [{ type: 'detection', description: 'confirms.', confirmed: true }],
      },
    ];
    expect((await evaluate(events, [])).score).toBe(0);
  });

  it('scores 0 when fewer esql calls than critical-open events', async () => {
    const events = [
      {
        status: 'open',
        severity: '80-critical',
        signals: [{ type: 'detection', description: 'confirms.', confirmed: true }],
      },
      {
        status: 'open',
        severity: '80-critical',
        signals: [{ type: 'detection', description: 'confirms.', confirmed: true }],
      },
    ];
    // Only 1 esql call for 2 critical-open events — insufficient per-event coverage
    expect((await evaluate(events, [esqlStep])).score).toBe(0);
  });

  it('gives partial credit when some critical-open events lack confirmed signals', async () => {
    const events = [
      {
        status: 'open',
        severity: '80-critical',
        signals: [{ type: 'detection', description: 'confirms.', confirmed: true }],
      },
      {
        status: 'open',
        severity: '80-critical',
        signals: [
          {
            type: 'detection',
            description: 'empty result.',
            evidence: { result: 'empty' },
          },
        ],
      },
    ];
    const twoEsqlSteps = [esqlStep, { ...esqlStep, tool_call_id: 'e2' }];
    expect((await evaluate(events, twoEsqlSteps)).score).toBe(0.5);
  });
});
