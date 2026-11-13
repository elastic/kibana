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
const trace = { traceId, esClient: {} as NonNullable<EvaluatorContext['trace']>['esClient'] };

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

  it('still exempts a template token at the edge of the bounded context', async () => {
    const result = await skillPiiEvaluator.evaluate({
      trace,
      round: round(`${'x'.repeat(5000)}jane.{id}.doe@corp.com`),
      log,
    });
    expect(result.scores[0]).toMatchObject({ score: 1, label: 'pass' });
  });

  it('scans a long whitespace-free run of matches in bounded time', async () => {
    const content = Array.from({ length: 5000 }, (_, i) => `u${i}@corp.com`).join(',');
    const started = Date.now();
    const result = await skillPiiEvaluator.evaluate({ trace, round: round(content), log });
    expect(Date.now() - started).toBeLessThan(2000);
    expect(result.scores[0].label).toBe('fail');
  });

  it.each([
    ['separate argument values', { to: 'admin@contoso.com', body: '{name}' }],
    ['a JSON-string argument', '{"to":"admin@contoso.com","body":"{name}"}'],
  ])('does not let a placeholder in %s exempt a real address', async (_label, args) => {
    const result = await skillPiiEvaluator.evaluate({
      trace,
      round: {
        input: { message: 'query' },
        steps: [{ tool_id: 'send', arguments: args }],
        response: { message: 'done' },
      },
      log,
    });
    expect(result.scores[0]).toMatchObject({ score: 0, label: 'fail' });
  });

  it('flags an address wrapped in angle brackets', async () => {
    const result = await skillPiiEvaluator.evaluate({
      trace,
      round: round('Contact <admin@contoso.com> for access'),
      log,
    });
    expect(result.scores[0]).toMatchObject({ score: 0, label: 'fail' });
  });

  it('does not flag an <email> placeholder', async () => {
    const result = await skillPiiEvaluator.evaluate({
      trace,
      round: round('Send it to <email> or {email}'),
      log,
    });
    expect(result.scores[0]).toMatchObject({ score: 1, label: 'pass' });
  });

  it('scans a long local-part-only run in linear time', async () => {
    const started = Date.now();
    const result = await skillPiiEvaluator.evaluate({
      trace,
      round: round('a'.repeat(200000)),
      log,
    });
    expect(Date.now() - started).toBeLessThan(2000);
    expect(result.scores[0]).toMatchObject({ score: 1, label: 'pass' });
  });

  it('flags a real address whose domain merely contains "placeholder"', async () => {
    const result = await skillPiiEvaluator.evaluate({
      trace,
      round: round('Email ceo@placeholder-bank.com for approval'),
      log,
    });
    expect(result.scores[0]).toMatchObject({ score: 0, label: 'fail' });
  });

  it('still exempts a placeholder@ address', async () => {
    const result = await skillPiiEvaluator.evaluate({
      trace,
      round: round('Send to placeholder@corp.com'),
      log,
    });
    expect(result.scores[0]).toMatchObject({ score: 1, label: 'pass' });
  });

  it('does not let a comma-separated placeholder exempt a real address', async () => {
    const result = await skillPiiEvaluator.evaluate({
      trace,
      round: round('admin@contoso.com,{name}'),
      log,
    });
    expect(result.scores[0]).toMatchObject({ score: 0, label: 'fail' });
  });
});
