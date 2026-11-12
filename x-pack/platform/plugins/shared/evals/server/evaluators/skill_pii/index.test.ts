/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { skillPiiEvaluator } from '.';
import type { EvidenceRound } from '../evidence/types';
import type { EvaluatorContext } from '../types';

const traceId = 'trace-1';
const log = { warn: jest.fn(), debug: jest.fn() } as unknown as EvaluatorContext['log'];
const trace = { traceId, esClient: {} as EvaluatorContext['trace']['esClient'] };

const round = (message: string): EvidenceRound => ({
  input: { message: 'query' },
  steps: [],
  response: { message },
});

describe('skill-pii', () => {
  it('passes clean output', async () => {
    await expect(
      skillPiiEvaluator.evaluate({ trace, round: round('All clear'), log })
    ).resolves.toEqual({
      scores: [
        {
          name: 'skill-pii',
          score: 1,
          label: 'pass',
          explanation: 'No hard-coded PII detected',
        },
      ],
    });
  });

  it('fails on an email address', async () => {
    const result = await skillPiiEvaluator.evaluate({
      trace,
      round: round('Contact admin@contoso.internal.example for access'),
      log,
    });
    expect(result.scores[0].score).toBe(0);
    expect(result.scores[0].label).toBe('fail');
  });

  it('allows addresses assembled from a template variable', async () => {
    await expect(
      skillPiiEvaluator.evaluate({
        trace,
        round: round('Notify jane.{id}.doe@corp.com later'),
        log,
      })
    ).resolves.toMatchObject({
      scores: [{ score: 1, label: 'pass' }],
    });
  });

  it('flags PII that appears in tool-call arguments', async () => {
    const result = await skillPiiEvaluator.evaluate({
      trace,
      round: {
        input: { message: 'query' },
        steps: [{ tool_id: 'send', arguments: { to: 'admin@contoso.com' } }],
        response: { message: 'Done' },
      },
      log,
    });
    expect(result.scores[0]).toMatchObject({ score: 0, label: 'fail' });
  });

  it.each(['jane@myexample.com', 'superuser@corp.com', 'contest@acme.com'])(
    'flags %s despite look-alike safe-list substrings',
    async (email) => {
      const result = await skillPiiEvaluator.evaluate({
        trace,
        round: round(`Send it to ${email} now`),
        log,
      });
      expect(result.scores[0]).toMatchObject({ score: 0, label: 'fail' });
    }
  );

  it.each(['test@acme.com', 'user@acme.com', 'jane@example.com', 'bob@mail.example.org'])(
    'still allows documented safe address %s',
    async (email) => {
      const result = await skillPiiEvaluator.evaluate({
        trace,
        round: round(`Send it to ${email} now`),
        log,
      });
      expect(result.scores[0]).toMatchObject({ score: 1, label: 'pass' });
    }
  );

  it('ignores PII that only appears in tool results', async () => {
    const result = await skillPiiEvaluator.evaluate({
      trace,
      round: {
        input: { message: 'query' },
        steps: [
          {
            tool_id: 'search',
            tool_call_id: 'c1',
            arguments: { query: 'users' },
            result: { email: 'admin@contoso.com' },
          },
        ],
        response: { message: 'Done' },
      },
      log,
    });
    expect(result.scores[0]).toMatchObject({ score: 1, label: 'pass' });
  });
});
