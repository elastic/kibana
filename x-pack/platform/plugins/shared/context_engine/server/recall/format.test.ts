/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import type {
  AiIndexRecallResult,
  RecallFormat,
  RecallResult,
  SessionEventRecallResult,
  SessionMemoryRecallResult,
} from '../../common/http_api/recall';
import { formatRecallYaml, packRecallResults } from './format';

const event: SessionEventRecallResult = {
  id: 'evt-1',
  session_id: 'sess-1',
  source: 'session_events',
  date: '2026-11-20T10:00:00.000Z',
  role: 'user',
  content: 'How do I rotate the API key?',
};

const memory: SessionMemoryRecallResult = {
  id: 'mem-1',
  session_id: 'sess-1',
  source: 'session_memory',
  date: '2026-11-21T10:00:00.000Z',
  content: 'The user prefers Terraform.',
  attributes: { topic: 'infra' },
};

const ki: AiIndexRecallResult = {
  id: 'ki-1',
  source: 'ai_index:runbooks',
  date: '2026-11-22T10:00:00.000Z',
  content: 'Rotate keys monthly.',
  attributes: { priority: 2, owner: 'sre', tags: ['security', 'keys'], meta: { reviewed: true } },
};

const item = (id: string, content: string): AiIndexRecallResult => ({
  id,
  source: 'ai_index:docs',
  content,
});

const render = (results: RecallResult[], format: RecallFormat): string =>
  format === 'yaml' ? formatRecallYaml(results) : JSON.stringify(results);

const expectedTokens = (text: string): number => Math.ceil(text.length / 4);

describe('formatRecallYaml', () => {
  it('roundtrips every result variant', () => {
    expect(parse(formatRecallYaml([event, memory, ki])).results).toEqual([event, memory, ki]);
  });

  it('writes fields in canonical order regardless of input order', () => {
    const shuffled = {
      content: event.content,
      role: event.role,
      date: event.date,
      source: event.source,
      session_id: event.session_id,
      id: event.id,
    } as const;
    const yaml = formatRecallYaml([shuffled]);
    expect(yaml).toBe(formatRecallYaml([event]));
    expect(Object.keys(parse(yaml).results[0])).toEqual([
      'id',
      'session_id',
      'source',
      'date',
      'role',
      'content',
    ]);
  });

  it('keeps multiline Markdown verbatim as a block scalar', () => {
    const content = '# Runbook\n\n- step one\n- step two\n\n```sh\nkubectl get pods\n```';
    const yaml = formatRecallYaml([{ ...ki, content }]);
    expect(yaml).toMatch(/content: \|-?\n/);
    expect(yaml).toContain('      # Runbook\n');
    expect(parse(yaml).results[0].content).toBe(content);
  });

  it.each([
    ['leading bold', '**bold** start'],
    ['colons', 'key: value: other'],
    ['document marker', '---'],
    ['leading dash', '- not a list'],
    ['hash', '# heading'],
  ])('roundtrips YAML-special content (%s)', (_label, content) => {
    expect(parse(formatRecallYaml([{ ...event, content }])).results[0].content).toBe(content);
  });

  it('does not hard-wrap long lines', () => {
    const content = Array.from({ length: 40 }, (_, i) => `word${i}`).join(' ');
    const yaml = formatRecallYaml([{ ...event, content }]);
    expect(yaml.split('\n').some((line) => line.includes(content))).toBe(true);
  });

  it('omits empty attributes and keeps non-empty ones', () => {
    const yaml = formatRecallYaml([{ ...memory, attributes: {} }, { ...ki, attributes: {} }, ki]);
    const [parsedMemory, parsedEmptyKi, parsedKi] = parse(yaml).results;
    expect(parsedMemory).not.toHaveProperty('attributes');
    expect(parsedEmptyKi).not.toHaveProperty('attributes');
    expect(parsedKi.attributes).toEqual(ki.attributes);
  });

  it('writes no anchors or aliases for shared attribute objects', () => {
    const shared = { team: 'sre', nested: { level: 1 } };
    const yaml = formatRecallYaml([
      { ...ki, id: 'ki-1', attributes: shared },
      { ...ki, id: 'ki-2', attributes: shared },
    ]);
    expect(yaml).not.toMatch(/[&*]\w/);
    expect(parse(yaml).results[1].attributes).toEqual(shared);
  });

  it('formats no results as an empty list', () => {
    expect(formatRecallYaml([])).toBe('results: []\n');
  });

  it('omits date on an AI index result without one', () => {
    const [parsed] = parse(formatRecallYaml([{ ...ki, date: undefined }])).results;
    expect(parsed).not.toHaveProperty('date');
    expect(parsed.content).toBe(ki.content);
  });
});

describe('packRecallResults', () => {
  it('returns nothing for no results', () => {
    expect(packRecallResults({ results: [], tokenBudget: 1000 })).toEqual({
      results: [],
      tokensReturned: 0,
    });
  });

  it('always keeps the first result even when it alone exceeds the budget', () => {
    const big = item('big', 'x'.repeat(10_000));
    const packed = packRecallResults({
      results: [big, item('small', 'y')],
      tokenBudget: 10,
    });
    expect(packed.results).toEqual([big]);
    expect(packed.tokensReturned).toBe(expectedTokens(formatRecallYaml([big])));
    expect(packed.tokensReturned).toBeGreaterThan(10);
  });

  it('stops at the first result that overflows instead of skipping to a smaller one', () => {
    const first = item('a', 'x'.repeat(100));
    const overflowing = item('b', 'x'.repeat(4000));
    const small = item('c', 'x');
    const budget = expectedTokens(formatRecallYaml([first, small]));
    const packed = packRecallResults({ results: [first, overflowing, small], tokenBudget: budget });
    expect(packed.results).toEqual([first]);
  });

  it.each<RecallFormat>(['yaml', 'json'])(
    'fits results that land exactly on the budget (%s)',
    (format) => {
      const results = [item('a', 'x'.repeat(100)), item('b', 'x'.repeat(100))];
      const exact = expectedTokens(render(results, format));
      expect(packRecallResults({ results, tokenBudget: exact, format }).results).toEqual(results);
      expect(packRecallResults({ results, tokenBudget: exact - 1, format }).results).toEqual([
        results[0],
      ]);
    }
  );

  it('rounds token counts up at the 4-character boundary', () => {
    for (const content of ['', 'x', 'xx', 'xxx']) {
      const candidate = item('a', content);
      const { tokensReturned } = packRecallResults({
        results: [candidate],
        tokenBudget: 1000,
        format: 'json',
      });
      expect(tokensReturned).toBe(expectedTokens(JSON.stringify([candidate])));
    }
  });

  it('strips empty attributes from packed results', () => {
    const packed = packRecallResults({
      results: [{ ...item('a', 'text'), attributes: {} }],
      tokenBudget: 1000,
    });
    expect(packed.results).toEqual([item('a', 'text')]);
  });

  it.each<RecallFormat>(['yaml', 'json'])(
    'reports the tokens of the rendered %s output',
    (format) => {
      const results: RecallResult[] = [
        {
          ...event,
          role: 'assistant',
          content: 'Line one\nLine two: with colon',
        },
        {
          ...memory,
          content: '**Prefers** Terraform',
        },
        item('ki-1', 'x'.repeat(250)),
      ];
      const packed = packRecallResults({ results, tokenBudget: 25_000, format });
      expect(packed.results).toEqual(results);
      expect(packed.tokensReturned).toBe(expectedTokens(render(results, format)));
    }
  );

  it('defaults to measuring YAML', () => {
    const results = [item('a', 'x'.repeat(100)), item('b', 'x'.repeat(100))];
    expect(packRecallResults({ results, tokenBudget: 25_000 }).tokensReturned).toBe(
      expectedTokens(formatRecallYaml(results))
    );
  });
});
