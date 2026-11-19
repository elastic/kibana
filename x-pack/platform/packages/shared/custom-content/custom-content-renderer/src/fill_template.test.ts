/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fillTemplateDatasets } from './fill_template';

const columns = [
  { name: 'host', type: 'keyword' },
  { name: 'count', type: 'long' },
];
const rows: unknown[][] = [
  ['web-1', 100],
  ['web-2', 50],
];

describe('fillTemplateDatasets with one query', () => {
  it('renders column values via bracket notation', async () => {
    const result = await fillTemplateDatasets(
      '<html><body>{% for row in rows %}<p>{{ row["host"].value }}: {{ row["count"].value }}</p>{% endfor %}</body></html>',
      [{ columns, rows }]
    );
    expect(result).toContain('web-1: 100');
    expect(result).toContain('web-2: 50');
  });

  it('computes pct as percentage of column max for numeric columns', async () => {
    const result = await fillTemplateDatasets(
      '<html><body>{% for row in rows %}<div style="width: {{ row["count"].pct }}%"></div>{% endfor %}</body></html>',
      [{ columns, rows }]
    );
    expect(result).toContain('width: 100%');
    expect(result).toContain('width: 50%');
  });

  it('does not set pct for non-numeric columns', async () => {
    const result = await fillTemplateDatasets(
      '<html><body>{% for row in rows %}{{ row["host"].pct }}{% endfor %}</body></html>',
      [{ columns, rows }]
    );
    expect(result).not.toContain('%');
  });

  it('handles an empty rows array without throwing', async () => {
    const result = await fillTemplateDatasets(
      '<html><body>{% if rows.size == 0 %}<p>No data</p>{% endif %}</body></html>',
      [{ columns, rows: [] }]
    );
    expect(result).toContain('No data');
  });

  it('clamps pct to 0 when the column max is 0', async () => {
    const result = await fillTemplateDatasets(
      '<html><body>{% for row in rows %}{{ row["count"].pct }}{% endfor %}</body></html>',
      [{ columns: [{ name: 'count', type: 'long' }], rows: [[0], [0]] }]
    );
    expect(result).toContain('0');
  });

  it('excludes null cells from the max calculation', async () => {
    const result = await fillTemplateDatasets(
      '<html><body>{% for row in rows %}{{ row["count"].pct }}{% endfor %}</body></html>',
      [{ columns: [{ name: 'count', type: 'long' }], rows: [[null], [50], [100]] }]
    );
    expect(result).toContain('100');
  });

  it('HTML-escapes cell values (outputEscape: escape)', async () => {
    const result = await fillTemplateDatasets(
      '<html><body>{% for row in rows %}{{ row["label"].value }}{% endfor %}</body></html>',
      [{ columns: [{ name: 'label', type: 'keyword' }], rows: [['<script>alert(1)</script>']] }]
    );
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('rejects when a template exceeds the render limit (DoS guard)', async () => {
    const template = '{% for a in (1..5000) %}{% for b in (1..5000) %}x{% endfor %}{% endfor %}';
    await expect(fillTemplateDatasets(template, [])).rejects.toThrow();
  });

  it('trims leading/trailing whitespace from the template before rendering', async () => {
    const result = await fillTemplateDatasets('  \n<html><body><p>hello</p></body></html>\n  ', [
      { columns, rows },
    ]);
    expect(result).toContain('<p>hello</p>');
  });

  // The engine is fetched over the network now, so a failed load must not be memoized —
  // otherwise one transient failure breaks every later render until a page reload.
  it('retries after a failed engine load instead of caching the failure', async () => {
    jest.resetModules();
    let attempt = 0;
    jest.doMock('liquidjs', () => {
      attempt += 1;
      if (attempt === 1) {
        throw new Error('chunk load failed');
      }
      return jest.requireActual('liquidjs');
    });

    const { fillTemplateDatasets: fillWithMockedEngine } = await import('./fill_template');

    await expect(fillWithMockedEngine('<p>hi</p>', [])).rejects.toThrow('chunk load failed');
    await expect(fillWithMockedEngine('<p>hi</p>', [])).resolves.toBe('<p>hi</p>');

    jest.dontMock('liquidjs');
  });
});

describe('fillTemplateDatasets', () => {
  const secondColumns = [
    { name: 'service', type: 'keyword' },
    { name: 'errors', type: 'long' },
  ];
  const secondRows: unknown[][] = [
    ['api', 8],
    ['db', 2],
  ];
  const datasets = [
    { columns, rows },
    { columns: secondColumns, rows: secondRows },
  ];

  it('keeps rows and max as the first query', async () => {
    const result = await fillTemplateDatasets(
      '{% for row in rows %}{{ row["host"].value }};{% endfor %}max={{ max["count"] }}',
      datasets
    );
    expect(result).toBe('web-1;web-2;max=100');
  });

  it('exposes every query by position, each with its own rows and pct', async () => {
    const result = await fillTemplateDatasets(
      '{% for row in queries[1].rows %}{{ row["service"].value }}={{ row["errors"].pct }};{% endfor %}max={{ queries[1].max["errors"] }}',
      datasets
    );
    expect(result).toBe('api=100;db=25;max=8');
  });

  it('renders a missing query as empty instead of throwing', async () => {
    const result = await fillTemplateDatasets(
      '{% for row in queries[5].rows %}x{% endfor %}none',
      datasets
    );
    expect(result).toBe('none');
  });
});
