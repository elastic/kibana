/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomContentTaskOutput, StoredCustomContent } from '../custom_content_output';
import type { CustomContentDatasetExample, CustomContentEvaluator } from '../types';
import { createDataExpectationEvaluator } from './data_expectation';
import { createEditEvaluator } from './edit';
import { createQueryContentsEvaluator } from './query_contents';
import { createRowLimitEvaluator, readLimit } from './row_limit';
import { createRowOrderEvaluator, labelsInOrder } from './row_order';
import { createTemplateColumnsEvaluator, readColumnReferences } from './template_columns';
import { createTemplateValidityEvaluator } from './template_validity';

const outputWith = (
  after: StoredCustomContent | undefined,
  overrides: Partial<CustomContentTaskOutput> = {}
): CustomContentTaskOutput => ({
  errors: [],
  messages: [],
  after,
  before: after,
  versionCount: 1,
  turns: 1,
  storedIn: 'visualization' as const,
  toolIds: [] as string[],
  otherRenderers: [] as string[],
  prompts: [],
  ...overrides,
});

const run = (
  evaluator: CustomContentEvaluator,
  output: CustomContentTaskOutput,
  expected: CustomContentDatasetExample['output'] = { data: 'query' }
) =>
  evaluator.evaluate({
    input: { question: 'q' },
    output,
    expected,
    metadata: {},
  });

const QUERY = 'FROM logs | STATS count = COUNT(*) BY host | LIMIT 100';

describe('Custom Content Template', () => {
  const evaluator = createTemplateValidityEvaluator();

  it('passes a script-free template within the limits', async () => {
    const result = await run(evaluator, outputWith({ template: '<p>hi</p>', height: 320 }));
    expect(result.score).toBe(1);
  });

  it.each([
    ['no panel', undefined],
    ['an empty template', { template: '  ' }],
    ['a script tag', { template: '<script>alert(1)</script>' }],
    ['a height below the minimum', { template: '<p>x</p>', height: 50 }],
    ['a height above the maximum', { template: '<p>x</p>', height: 5000 }],
  ])('fails %s', async (_, panel) => {
    const result = await run(evaluator, outputWith(panel));
    expect(result.score).toBeLessThan(1);
  });
});

describe('missing panel diagnostics', () => {
  it('names the tools and other renderers when no panel was stored', async () => {
    const result = await run(
      createTemplateValidityEvaluator(),
      outputWith(undefined, {
        toolIds: ['load_skill', 'platform.core.create_visualization'],
        otherRenderers: ['lens'],
      })
    );

    expect(result).toMatchObject({ score: 0, label: 'no-panel' });
    expect(result.explanation).toContain('It created: lens.');
    expect(result.explanation).toContain('load_skill, platform.core.create_visualization');
  });
});

describe('Custom Content Data', () => {
  const evaluator = createDataExpectationEvaluator();

  it('accepts a query where data is expected and none where static is expected', async () => {
    expect((await run(evaluator, outputWith({ esql: QUERY }), { data: 'query' })).score).toBe(1);
    expect((await run(evaluator, outputWith({ template: '<p/>' }), { data: 'static' })).score).toBe(
      1
    );
  });

  it('rejects a stray query on a static panel and a missing query on a data panel', async () => {
    const stray = await run(evaluator, outputWith({ esql: 'ROW title = "Web Traffic Overview"' }), {
      data: 'static',
    });
    expect(stray).toMatchObject({ score: 0, label: 'unexpected-query' });

    const missing = await run(evaluator, outputWith({ template: '<p/>' }), { data: 'query' });
    expect(missing).toMatchObject({ score: 0, label: 'missing-query' });
  });

  it('fails when no panel was stored', async () => {
    expect((await run(evaluator, outputWith(undefined))).score).toBe(0);
  });
});

describe('Custom Content Query Contents', () => {
  const evaluator = createQueryContentsEvaluator();

  it('skips examples without expected text', async () => {
    expect((await run(evaluator, outputWith({ esql: QUERY }))).score).toBeNull();
  });

  it('ignores case and whitespace', async () => {
    const result = await run(evaluator, outputWith({ esql: 'FROM   logs\n| STATS c = COUNT(*)' }), {
      data: 'query',
      queryContains: ['from logs', 'stats c = count(*)'],
    });
    expect(result.score).toBe(1);
  });

  it('reports the missing text', async () => {
    const result = await run(evaluator, outputWith({ esql: QUERY }), {
      data: 'query',
      queryContains: ['BY host', 'BY machine.os'],
    });
    expect(result.score).toBe(0.5);
    expect(result.metadata).toMatchObject({ missing: ['BY machine.os'] });
  });
});

describe('Custom Content Row Limit', () => {
  const evaluator = createRowLimitEvaluator();

  it('reads the last LIMIT of a query', () => {
    expect(readLimit('FROM a | LIMIT 5 | KEEP x | LIMIT 100')).toBe(100);
    expect(readLimit('FROM a | STATS c = COUNT(*)')).toBeUndefined();
  });

  it('rejects the chart default of 10 when no limit is declared', async () => {
    const result = await run(evaluator, outputWith({ esql: 'FROM a | LIMIT 10' }));
    expect(result).toMatchObject({ score: 0, label: 'chart-default-limit' });
  });

  it('accepts other limits and queries without one', async () => {
    expect((await run(evaluator, outputWith({ esql: 'FROM a | LIMIT 100' }))).score).toBe(1);
    expect((await run(evaluator, outputWith({ esql: 'FROM a | LIMIT 50' }))).score).toBe(1);
    expect((await run(evaluator, outputWith({ esql: 'FROM a | STATS c = COUNT(*)' }))).score).toBe(
      1
    );
  });

  it('requires the declared limit exactly', async () => {
    const declared = { data: 'query' as const, limit: 5 };
    expect((await run(evaluator, outputWith({ esql: 'FROM a | LIMIT 5' }), declared)).score).toBe(
      1
    );
    expect((await run(evaluator, outputWith({ esql: 'FROM a | LIMIT 10' }), declared)).score).toBe(
      0
    );
  });

  it('skips a panel without a query', async () => {
    expect((await run(evaluator, outputWith({ template: '<p/>' }))).score).toBeNull();
  });
});

describe('Custom Content Row Order', () => {
  it('matches labels in order, ignoring case and decoration', () => {
    expect(
      labelsInOrder(
        ['1. Total Flights', '2. Delayed', 'Cancelled'],
        ['total', 'delayed', 'cancelled']
      )
    ).toBe(true);
    expect(
      labelsInOrder(['Cancelled', 'Total', 'Delayed'], ['total', 'delayed', 'cancelled'])
    ).toBe(false);
    expect(labelsInOrder(['Total', 'Delayed'], ['total', 'delayed', 'cancelled'])).toBe(false);
  });

  const expected = { data: 'query' as const, rowOrder: ['total', 'delayed', 'cancelled'] };
  const runWith = (result: {
    columns: Array<{ name: string; type: string }>;
    values: unknown[][];
  }) =>
    run(
      createRowOrderEvaluator({ runQuery: jest.fn().mockResolvedValue(result) }),
      outputWith({ esql: 'FROM flights' }),
      expected
    );

  it('passes rows listed in the requested order', async () => {
    const result = await runWith({
      columns: [
        { name: 'Step', type: 'keyword' },
        { name: 'Count', type: 'long' },
      ],
      values: [
        ['Total Flights', 13000],
        ['Delayed Flights', 2500],
        ['Cancelled Flights', 600],
      ],
    });
    expect(result.score).toBe(1);
  });

  it('fails a funnel sorted by value or returned as one wide row', async () => {
    const sorted = await runWith({
      columns: [{ name: 'Step', type: 'keyword' }],
      values: [['Delayed'], ['Total'], ['Cancelled']],
    });
    expect(sorted.score).toBe(0);

    const wide = await runWith({
      columns: [
        { name: 'Total Flights', type: 'long' },
        { name: 'Delayed Flights', type: 'long' },
        { name: 'Cancelled Flights', type: 'long' },
      ],
      values: [[13000, 2500, 600]],
    });
    expect(wide.score).toBe(0);
  });

  it('reports a query that fails to run', async () => {
    const result = await run(
      createRowOrderEvaluator({ runQuery: jest.fn().mockRejectedValue(new Error('boom')) }),
      outputWith({ esql: 'FROM flights' }),
      expected
    );
    expect(result).toMatchObject({ score: 0, label: 'query-failed' });
  });

  it('skips examples without an expected order', async () => {
    const result = await run(
      createRowOrderEvaluator({ runQuery: jest.fn() }),
      outputWith({ esql: 'FROM flights' })
    );
    expect(result.score).toBeNull();
  });
});

describe('Custom Content Template Columns', () => {
  it('reads the columns the template references', () => {
    expect(
      readColumnReferences(
        '{% for row in rows %}{{ row["Request Count"].value }} {{ row[\'Error Rate\'].pct }}{% endfor %}{{ max["Request Count"] }}'
      )
    ).toEqual(['Request Count', 'Error Rate']);
  });

  const withColumns = (names: string[]) =>
    createTemplateColumnsEvaluator({
      runQuery: jest
        .fn()
        .mockResolvedValue({ columns: names.map((name) => ({ name, type: 'long' })) }),
    });
  const panel = {
    esql: 'FROM logs',
    template:
      '{% for row in rows %}{{ row["Request Count"].value }}{{ row["Error Rate"].value }}{% endfor %}',
  };

  it('passes when every referenced column is returned', async () => {
    expect((await run(withColumns(['Request Count', 'Error Rate']), outputWith(panel))).score).toBe(
      1
    );
  });

  it('reports referenced columns the query does not return', async () => {
    const result = await run(withColumns(['Request Count']), outputWith(panel));
    expect(result.score).toBe(0.5);
    expect(result.metadata).toMatchObject({ missing: ['Error Rate'] });
  });

  it('skips a static panel and a template that reads no columns', async () => {
    expect((await run(withColumns([]), outputWith({ template: '<p/>' }))).score).toBeNull();
    expect(
      (await run(withColumns([]), outputWith({ esql: 'FROM logs', template: '<p>hi</p>' }))).score
    ).toBeNull();
  });
});

describe('Custom Content Edit', () => {
  const evaluator = createEditEvaluator();
  const before = { esql: QUERY, template: '<p>old</p>' };

  it('skips examples that are not edits', async () => {
    expect((await run(evaluator, outputWith(before))).score).toBeNull();
  });

  it('fails when the follow-up did not store a new version', async () => {
    const result = await run(evaluator, outputWith(before, { before, versionCount: 1 }), {
      data: 'query',
      edit: 'style',
    });
    expect(result).toMatchObject({ score: 0, label: 'not-stored-as-edit' });
  });

  it('passes a style edit that changes the template and keeps the query', async () => {
    const result = await run(
      evaluator,
      outputWith({ esql: QUERY, template: '<p>new</p>' }, { before, versionCount: 2 }),
      { data: 'query', edit: 'style' }
    );
    expect(result.score).toBe(1);
  });

  it('fails a style edit that changed the query', async () => {
    const result = await run(
      evaluator,
      outputWith({ esql: 'FROM other', template: '<p>new</p>' }, { before, versionCount: 2 }),
      { data: 'query', edit: 'style' }
    );
    expect(result.score).toBe(0.5);
  });

  it('passes a data edit that changed the query and fails one that did not', async () => {
    const changed = await run(
      evaluator,
      outputWith(
        { esql: `${QUERY} | KEEP host`, template: '<p>new</p>' },
        { before, versionCount: 2 }
      ),
      { data: 'query', edit: 'data' }
    );
    expect(changed.score).toBe(1);

    const unchanged = await run(
      evaluator,
      outputWith({ esql: QUERY, template: '<p>new</p>' }, { before, versionCount: 2 }),
      { data: 'query', edit: 'data' }
    );
    expect(unchanged).toMatchObject({ score: 0, label: 'data-edit-failed' });
  });
});
