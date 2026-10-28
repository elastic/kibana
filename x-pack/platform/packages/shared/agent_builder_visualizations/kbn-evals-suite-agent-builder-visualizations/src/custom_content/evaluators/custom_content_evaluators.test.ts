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
import {
  createDataEditAppliedEvaluator,
  findMeasureAliases,
  templateReadsColumn,
} from './edit_applied';
import { createStyleEditJudge } from './style_edit_judge';
import { createTemplateValidityEvaluator } from './template_validity';

const outputWith = (
  after: StoredCustomContent | undefined,
  overrides: Partial<CustomContentTaskOutput> = {}
): CustomContentTaskOutput => ({
  errors: [],
  messages: [],
  after,
  attachmentId: 'att-1',
  versionCount: 1,
  turns: 1,
  storedIn: 'visualization' as const,
  toolIds: [] as string[],
  visualizations: [],
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

  it('fails a template whose Liquid block is not closed', async () => {
    const result = await run(
      createTemplateValidityEvaluator(),
      outputWith({ template: '<div>{% if true %}Hello</div>' })
    );
    expect(result.score).toBeLessThan(1);
    expect(result.explanation).toContain('valid Liquid');
  });

  it('accepts a template that loops over the rows', async () => {
    const result = await run(
      createTemplateValidityEvaluator(),
      outputWith({
        template: '<ul>{% for r in rows %}<li>{{ r["host"].value }}</li>{% endfor %}</ul>',
      })
    );
    expect(result.score).toBe(1);
  });

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

  it('ignores backticks and spacing inside an expression', async () => {
    const result = await run(
      evaluator,
      outputWith({ esql: 'FROM logs | STATS avg_bytes = AVG( `bytes` ) BY `machine.os`' }),
      { data: 'query', queryContains: ['AVG(bytes)', 'machine.os'] }
    );
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

  it('matches whole words only', () => {
    expect(labelsInOrder(['Subtotal', 'Delayed', 'Cancelled'], ['total', 'delayed'])).toBe(false);
    expect(labelsInOrder(['Total (all)', 'Delayed'], ['total (all)', 'delayed'])).toBe(true);
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

  it('says when a template reads columns by dot access, which it does not check', async () => {
    const result = await run(
      withColumns(['host']),
      outputWith({ esql: 'FROM logs', template: '<p>{{ row.host.value }}</p>' })
    );
    expect(result.score).toBeNull();
    expect(result.explanation).toContain('dot access');
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

  const editOutput = (
    after: StoredCustomContent | undefined,
    {
      baselineContent = before,
      baselineVersions = 1,
      baselineAttachmentId = 'att-1',
      versions = 2,
      ...overrides
    }: Partial<CustomContentTaskOutput> & {
      baselineContent?: StoredCustomContent;
      baselineVersions?: number;
      baselineAttachmentId?: string;
      versions?: number;
    } = {}
  ) =>
    outputWith(after, {
      versionCount: versions,
      baseline: {
        attachmentId: baselineAttachmentId,
        content: baselineContent,
        versionCount: baselineVersions,
      },
      ...overrides,
    });

  const style = { data: 'query' as const, edit: 'style' as const };
  const data = { data: 'query' as const, edit: 'data' as const };

  it('skips examples that are not edits', async () => {
    expect((await run(evaluator, outputWith(before))).score).toBeNull();
  });

  it('fails when the follow-up did not store a new version', async () => {
    const result = await run(evaluator, editOutput(before, { versions: 1 }), style);
    expect(result).toMatchObject({ score: 0, label: 'not-stored-as-edit' });
  });

  it('does not count versions written while creating the panel as the edit', async () => {
    const result = await run(
      evaluator,
      editOutput({ esql: QUERY, template: '<p>new</p>' }, { baselineVersions: 2, versions: 2 }),
      style
    );
    expect(result).toMatchObject({ score: 0, label: 'not-stored-as-edit' });
  });

  it('fails when there is no panel from the first turn', async () => {
    const result = await run(
      evaluator,
      outputWith(before, { versionCount: 2, baseline: { versionCount: 0 } }),
      style
    );
    expect(result).toMatchObject({ score: 0, label: 'not-stored-as-edit' });
  });

  it('fails when the follow-up created a new panel instead of editing the first', async () => {
    const result = await run(
      evaluator,
      editOutput(
        { esql: QUERY, template: '<p>new</p>' },
        { baselineAttachmentId: 'att-0', versions: 2 }
      ),
      style
    );
    expect(result).toMatchObject({ score: 0, label: 'new-panel-instead-of-edit' });
  });

  it('fails when the follow-up added a second panel to the same dashboard', async () => {
    const result = await run(
      evaluator,
      outputWith(
        { esql: 'FROM other', template: '<p>new</p>' },
        {
          attachmentId: 'dash-1',
          panelId: 'panel-2',
          versionCount: 2,
          baseline: {
            attachmentId: 'dash-1',
            panelId: 'panel-1',
            content: before,
            versionCount: 1,
          },
        }
      ),
      data
    );
    expect(result).toMatchObject({ score: 0, label: 'new-panel-instead-of-edit' });
  });

  it('passes an edit of the same panel inside a dashboard', async () => {
    const result = await run(
      evaluator,
      outputWith(
        { esql: `${QUERY} | KEEP host`, template: '<p>new</p>' },
        {
          attachmentId: 'dash-1',
          panelId: 'panel-1',
          versionCount: 2,
          baseline: {
            attachmentId: 'dash-1',
            panelId: 'panel-1',
            content: before,
            versionCount: 1,
          },
        }
      ),
      data
    );
    expect(result.score).toBe(1);
  });

  it('fails a follow-up that made no tool call, even when the stored panel has several versions', async () => {
    const result = await run(
      evaluator,
      editOutput(before, { versions: 3, followUpToolIds: [] }),
      data
    );
    expect(result).toMatchObject({ score: 0, label: 'no-follow-up-tool-call' });
  });

  it('puts what the follow-up passed to the tools in the failure metadata', async () => {
    const result = await run(
      evaluator,
      editOutput(before, {
        followUpToolIds: ['platform.dashboard.generate_dashboard'],
        followUpToolArgs: ['generate_dashboard panel p1: hasData=unset'],
      }),
      data
    );
    expect(result.metadata).toMatchObject({
      followUpToolArgs: ['generate_dashboard panel p1: hasData=unset'],
    });
  });

  it('judges the edit itself when the follow-up called a tool', async () => {
    const result = await run(
      evaluator,
      editOutput(before, { followUpToolIds: ['platform.dashboard.generate_dashboard'] }),
      data
    );
    expect(result).toMatchObject({ score: 0, label: 'data-edit-failed' });
  });

  it('passes a style edit that changes the template and keeps the query', async () => {
    const result = await run(evaluator, editOutput({ esql: QUERY, template: '<p>new</p>' }), style);
    expect(result.score).toBe(1);
  });

  it('does not blame a style edit for a query changed while creating the panel', async () => {
    const created = { esql: 'FROM other', template: '<p>old</p>' };
    const result = await run(
      evaluator,
      editOutput({ esql: 'FROM other', template: '<p>new</p>' }, { baselineContent: created }),
      style
    );
    expect(result.score).toBe(1);
  });

  it('fails a style edit that changed the query', async () => {
    const result = await run(
      evaluator,
      editOutput({ esql: 'FROM other', template: '<p>new</p>' }),
      style
    );
    expect(result.score).toBe(0.5);
  });

  it('passes a data edit that changed the query and fails one that did not', async () => {
    const changed = await run(
      evaluator,
      editOutput({ esql: `${QUERY} | KEEP host`, template: '<p>new</p>' }),
      data
    );
    expect(changed.score).toBe(1);

    const unchanged = await run(
      evaluator,
      editOutput({ esql: QUERY, template: '<p>new</p>' }),
      data
    );
    expect(unchanged).toMatchObject({ score: 0, label: 'data-edit-failed' });
  });
});

describe('Custom Content Data Edit Applied', () => {
  const columnsByQuery: Record<string, string[]> = {
    'FROM logs | STATS requests = COUNT(*), avg_bytes = AVG(bytes) BY host': [
      'requests',
      'avg_bytes',
      'host',
    ],
    'FROM logs | STATS total = COUNT(*)': ['total'],
    'FROM logs | STATS `Avg Bytes` = AVG( `bytes` ) BY host': ['Avg Bytes', 'host'],
  };
  const runQuery = jest.fn(async (query: string) => {
    if (!(query in columnsByQuery)) throw new Error('unknown query');
    return { columns: columnsByQuery[query].map((name) => ({ name, type: 'long' })), values: [] };
  });
  const evaluator = createDataEditAppliedEvaluator({ runQuery: runQuery as never });
  const gold = { data: 'query' as const, edit: 'data' as const, addsMeasure: 'AVG(bytes)' };
  const AFTER = 'FROM logs | STATS requests = COUNT(*), avg_bytes = AVG(bytes) BY host';
  const after = (template: string, esql = AFTER) => outputWith({ esql, template });

  it('reads a column through bracket access with either quote, or dot access for a plain name', () => {
    expect(templateReadsColumn('{{ row["avg_bytes"].value }}', 'avg_bytes')).toBe(true);
    expect(templateReadsColumn("{{ r['avg_bytes'].value }}", 'avg_bytes')).toBe(true);
    expect(templateReadsColumn('{{ row.avg_bytes.value }}', 'avg_bytes')).toBe(true);
    expect(templateReadsColumn('{{ row.avg_bytes_total.value }}', 'avg_bytes')).toBe(false);
    expect(templateReadsColumn('{{ row.value }}', 'avg_bytes')).toBe(false);
    expect(templateReadsColumn('{{ row["Avg Bytes"].value }}', 'Avg Bytes')).toBe(true);
  });

  it('finds the alias of a measure however the query spells it', () => {
    expect(findMeasureAliases(AFTER, 'AVG(bytes)')).toEqual(['avg_bytes']);
    expect(
      findMeasureAliases('FROM logs | STATS `Avg Bytes` = AVG( `bytes` ) BY host', 'AVG(bytes)')
    ).toEqual(['Avg Bytes']);
    expect(findMeasureAliases('FROM logs | STATS total = COUNT(*)', 'COUNT(')).toEqual(['total']);
    expect(findMeasureAliases(AFTER, 'MAX(bytes)')).toEqual([]);
  });

  it('skips examples that are not a data edit that names a measure', async () => {
    expect((await run(evaluator, after('<p/>'), { data: 'query', edit: 'data' })).score).toBeNull();
    expect(
      (await run(evaluator, after('<p/>'), { ...gold, edit: 'style' as const })).score
    ).toBeNull();
  });

  it('passes when the template shows the added measure', async () => {
    const result = await run(evaluator, after('<b>{{ row["avg_bytes"].value }}</b>'), gold);
    expect(result).toMatchObject({ score: 1, label: 'new-measure-shown' });
  });

  it('passes when the template reads the measure with dot access', async () => {
    const result = await run(evaluator, after('<b>{{ row.avg_bytes.value }}</b>'), gold);
    expect(result.score).toBe(1);
  });

  it('fails when the template still shows only the measure the query already had', async () => {
    const result = await run(evaluator, after('<b>{{ row["requests"].value }}</b>'), gold);
    expect(result).toMatchObject({ score: 0, label: 'new-measure-not-shown' });
  });

  it('is not fooled by a column the edit renamed', async () => {
    const result = await run(
      evaluator,
      after('<b>{{ row["requests"].value }} {{ row["host"].value }}</b>'),
      gold
    );
    expect(result.score).toBe(0);
  });

  it('finds a measure whose name has spaces and backticks', async () => {
    const query = 'FROM logs | STATS `Avg Bytes` = AVG( `bytes` ) BY host';
    expect((await run(evaluator, after('{{ row["Avg Bytes"].value }}', query), gold)).score).toBe(
      1
    );
    expect((await run(evaluator, after('{{ row["host"].value }}', query), gold)).score).toBe(0);
  });

  it('works on a panel that was static before the edit', async () => {
    const result = await run(
      evaluator,
      after('<b>{{ row["total"].value }}</b>', 'FROM logs | STATS total = COUNT(*)'),
      { data: 'query', edit: 'data', addsMeasure: 'COUNT(' }
    );
    expect(result.score).toBe(1);
  });

  it('skips when the query does not run or does not return the measure', async () => {
    expect((await run(evaluator, after('<p/>', 'FROM nowhere'), gold)).score).toBeNull();
    expect(
      (await run(evaluator, after('<p/>', 'FROM logs | STATS total = COUNT(*)'), gold)).score
    ).toBeNull();
  });
});

describe('Custom Content Style Edit', () => {
  const judge = { evaluate: jest.fn(), kind: 'LLM' as const, direction: 'maximize' as const };
  const criteria = jest.fn(() => judge as never);
  const evaluator = createStyleEditJudge({ criteria });
  const styleGold = { data: 'query' as const, edit: 'style' as const };
  const withTemplates = outputWith(
    { esql: QUERY, template: '<b class="blue">x</b>' },
    {
      baseline: {
        attachmentId: 'att-1',
        content: { esql: QUERY, template: '<b>x</b>' },
        versionCount: 1,
      },
    }
  );

  beforeEach(() => judge.evaluate.mockReset());

  it('gives the judge the instruction and both templates, and returns its verdict', async () => {
    judge.evaluate.mockResolvedValue({ score: 1, explanation: 'ok' });

    const result = await evaluator.evaluate({
      input: { question: 'q', followUp: 'Make the badges blue.' },
      output: withTemplates,
      expected: styleGold,
      metadata: {},
    });

    expect(result.score).toBe(1);
    expect(judge.evaluate).toHaveBeenCalledWith(
      expect.objectContaining({
        input: { instruction: 'Make the badges blue.' },
        output: { templateBefore: '<b>x</b>', templateAfter: '<b class="blue">x</b>' },
      })
    );
  });

  it('skips data edits, single-turn examples and runs without a template to compare', async () => {
    const skip = async (
      input: { question: string; followUp?: string },
      output = withTemplates,
      expected: typeof styleGold | { data: 'query'; edit: 'data' } = styleGold
    ) => (await evaluator.evaluate({ input, output, expected, metadata: {} })).score;

    expect(
      await skip({ question: 'q', followUp: 'x' }, withTemplates, { data: 'query', edit: 'data' })
    ).toBeNull();
    expect(await skip({ question: 'q' })).toBeNull();
    expect(await skip({ question: 'q', followUp: 'x' }, outputWith(undefined))).toBeNull();
    expect(judge.evaluate).not.toHaveBeenCalled();
  });
});
