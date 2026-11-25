/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiIndexRecallResult, RecallFormat, RecallResult } from '../../common/http_api/recall';
import { packRecallResults } from './budget';
import { formatRecallYaml } from './format';

const result = (id: string, content: string): AiIndexRecallResult => ({
  id,
  source: 'ai_index:docs',
  content,
});

const render = (results: RecallResult[], format: RecallFormat): string =>
  format === 'yaml' ? formatRecallYaml(results) : JSON.stringify(results);

const expectedTokens = (text: string): number => Math.ceil(text.length / 4);

describe('packRecallResults', () => {
  it('returns nothing for no results', () => {
    expect(packRecallResults({ results: [], tokenBudget: 1000 })).toEqual({
      results: [],
      tokensReturned: 0,
    });
  });

  it('always keeps the first result even when it alone exceeds the budget', () => {
    const big = result('big', 'x'.repeat(10_000));
    const packed = packRecallResults({
      results: [big, result('small', 'y')],
      tokenBudget: 10,
    });
    expect(packed.results).toEqual([big]);
    expect(packed.tokensReturned).toBe(expectedTokens(formatRecallYaml([big])));
    expect(packed.tokensReturned).toBeGreaterThan(10);
  });

  it('stops at the first result that overflows instead of skipping to a smaller one', () => {
    const first = result('a', 'x'.repeat(100));
    const overflowing = result('b', 'x'.repeat(4000));
    const small = result('c', 'x');
    const budget = expectedTokens(formatRecallYaml([first, small]));
    const packed = packRecallResults({ results: [first, overflowing, small], tokenBudget: budget });
    expect(packed.results).toEqual([first]);
  });

  it.each<RecallFormat>(['yaml', 'json'])(
    'fits results that land exactly on the budget (%s)',
    (format) => {
      const results = [result('a', 'x'.repeat(100)), result('b', 'x'.repeat(100))];
      const exact = expectedTokens(render(results, format));
      expect(packRecallResults({ results, tokenBudget: exact, format }).results).toEqual(results);
      expect(packRecallResults({ results, tokenBudget: exact - 1, format }).results).toEqual([
        results[0],
      ]);
    }
  );

  it('rounds token counts up at the 4-character boundary', () => {
    const base = result('a', 'x'.repeat(4));
    const baseLen = JSON.stringify([base]).length;
    const padToMultipleOf4 = (4 - (baseLen % 4)) % 4;
    const exactMultiple = result('a', 'x'.repeat(4 + padToMultipleOf4));
    const oneCharOver = result('a', 'x'.repeat(5 + padToMultipleOf4));
    const exactLen = JSON.stringify([exactMultiple]).length;

    expect(
      packRecallResults({ results: [exactMultiple], tokenBudget: 1000, format: 'json' })
        .tokensReturned
    ).toBe(exactLen / 4);
    expect(
      packRecallResults({ results: [oneCharOver], tokenBudget: 1000, format: 'json' })
        .tokensReturned
    ).toBe(exactLen / 4 + 1);
  });

  it('strips empty attributes from packed results', () => {
    const packed = packRecallResults({
      results: [{ ...result('a', 'text'), attributes: {} }],
      tokenBudget: 1000,
    });
    expect(packed.results).toEqual([result('a', 'text')]);
  });

  it.each<RecallFormat>(['yaml', 'json'])(
    'reports the tokens of the rendered %s output',
    (format) => {
      const results: RecallResult[] = [
        {
          id: 'evt-1',
          session_id: 's',
          source: 'session_events',
          date: '2026-11-20T10:00:00.000Z',
          role: 'assistant',
          content: 'Line one\nLine two: with colon',
        },
        {
          id: 'mem-1',
          session_id: 's',
          source: 'session_memory',
          date: '2026-11-21T10:00:00.000Z',
          content: '**Prefers** Terraform',
          attributes: { topic: 'infra' },
        },
        result('ki-1', 'x'.repeat(250)),
      ];
      const packed = packRecallResults({ results, tokenBudget: 25_000, format });
      expect(packed.results).toEqual(results);
      expect(packed.tokensReturned).toBe(expectedTokens(render(results, format)));
    }
  );

  it('defaults to measuring YAML', () => {
    const results = [result('a', 'x'.repeat(100)), result('b', 'x'.repeat(100))];
    expect(packRecallResults({ results, tokenBudget: 25_000 }).tokensReturned).toBe(
      expectedTokens(formatRecallYaml(results))
    );
  });
});
