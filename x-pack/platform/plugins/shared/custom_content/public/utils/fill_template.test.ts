/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fillTemplate } from './fill_template';

const columns = [
  { name: 'host', type: 'keyword' },
  { name: 'count', type: 'long' },
];
const rows: unknown[][] = [
  ['web-1', 100],
  ['web-2', 50],
];

describe('fillTemplate', () => {
  it('renders column values via bracket notation', async () => {
    const result = await fillTemplate(
      '<html><body>{% for row in rows %}<p>{{ row["host"].value }}: {{ row["count"].value }}</p>{% endfor %}</body></html>',
      columns,
      rows
    );
    expect(result).toContain('web-1: 100');
    expect(result).toContain('web-2: 50');
  });

  it('computes pct as percentage of column max for numeric columns', async () => {
    const result = await fillTemplate(
      '<html><body>{% for row in rows %}<div style="width: {{ row["count"].pct }}%"></div>{% endfor %}</body></html>',
      columns,
      rows
    );
    expect(result).toContain('width: 100%');
    expect(result).toContain('width: 50%');
  });

  it('does not set pct for non-numeric columns', async () => {
    const result = await fillTemplate(
      '<html><body>{% for row in rows %}{{ row["host"].pct }}{% endfor %}</body></html>',
      columns,
      rows
    );
    expect(result).not.toContain('%');
  });

  it('handles an empty rows array without throwing', async () => {
    const result = await fillTemplate(
      '<html><body>{% if rows.size == 0 %}<p>No data</p>{% endif %}</body></html>',
      columns,
      []
    );
    expect(result).toContain('No data');
  });

  it('clamps pct to 0 when the column max is 0', async () => {
    const result = await fillTemplate(
      '<html><body>{% for row in rows %}{{ row["count"].pct }}{% endfor %}</body></html>',
      [{ name: 'count', type: 'long' }],
      [[0], [0]]
    );
    expect(result).toContain('0');
  });

  it('excludes null cells from the max calculation', async () => {
    const result = await fillTemplate(
      '<html><body>{% for row in rows %}{{ row["count"].pct }}{% endfor %}</body></html>',
      [{ name: 'count', type: 'long' }],
      [[null], [50], [100]]
    );
    expect(result).toContain('100');
  });

  it('HTML-escapes cell values (outputEscape: escape)', async () => {
    const result = await fillTemplate(
      '<html><body>{% for row in rows %}{{ row["label"].value }}{% endfor %}</body></html>',
      [{ name: 'label', type: 'keyword' }],
      [['<script>alert(1)</script>']]
    );
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('rejects when a template exceeds the render limit (DoS guard)', async () => {
    const template = '{% for a in (1..5000) %}{% for b in (1..5000) %}x{% endfor %}{% endfor %}';
    await expect(fillTemplate(template, [], [])).rejects.toThrow();
  });

  it('trims leading/trailing whitespace from the template before rendering', async () => {
    const result = await fillTemplate(
      '  \n<html><body><p>hello</p></body></html>\n  ',
      columns,
      rows
    );
    expect(result).toContain('<p>hello</p>');
  });
});
