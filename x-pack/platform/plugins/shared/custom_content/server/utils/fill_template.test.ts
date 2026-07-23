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
    const template =
      '<html><body>{% for row in rows %}<p>{{ row["host"].value }}: {{ row["count"].value }}</p>{% endfor %}</body></html>';
    const result = await fillTemplate(template, columns, rows);
    expect(result).toContain('web-1: 100');
    expect(result).toContain('web-2: 50');
  });

  it('computes pct as percentage of column max for numeric columns', async () => {
    const template =
      '<html><body>{% for row in rows %}<div style="width: {{ row["count"].pct }}%"></div>{% endfor %}</body></html>';
    const result = await fillTemplate(template, columns, rows);
    expect(result).toContain('width: 100%');
    expect(result).toContain('width: 50%');
  });

  it('does not set pct for non-numeric columns', async () => {
    const template =
      '<html><body>{% for row in rows %}{{ row["host"].pct }}{% endfor %}</body></html>';
    const result = await fillTemplate(template, columns, rows);
    expect(result).not.toContain('%');
  });

  it('handles an empty rows array without throwing', async () => {
    const template = '<html><body>{% if rows.size == 0 %}<p>No data</p>{% endif %}</body></html>';
    const result = await fillTemplate(template, columns, []);
    expect(result).toContain('No data');
  });

  it('clamps pct to 0 when the column max is 0', async () => {
    const zeroCols = [{ name: 'count', type: 'long' }];
    const zeroRows: unknown[][] = [[0], [0]];
    const template =
      '<html><body>{% for row in rows %}{{ row["count"].pct }}{% endfor %}</body></html>';
    const result = await fillTemplate(template, zeroCols, zeroRows);
    expect(result).toContain('0');
  });

  it('HTML-escapes cell values (outputEscape: escape)', async () => {
    const xssCols = [{ name: 'label', type: 'keyword' }];
    const xssRows: unknown[][] = [['<script>alert(1)</script>']];
    const template =
      '<html><body>{% for row in rows %}{{ row["label"].value }}{% endfor %}</body></html>';
    const result = await fillTemplate(template, xssCols, xssRows);
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('trims leading/trailing whitespace from the template before rendering', async () => {
    const template = '  \n<html><body><p>hello</p></body></html>\n  ';
    const result = await fillTemplate(template, columns, rows);
    expect(result).toContain('<p>hello</p>');
  });

  it('rejects when a template attempts to include a file (SSTI/LFI guard)', async () => {
    await expect(fillTemplate('{% render "/etc/passwd" %}', columns, rows)).rejects.toThrow(
      'partials are disabled'
    );
    await expect(fillTemplate('{% include "/etc/passwd" %}', columns, rows)).rejects.toThrow(
      'partials are disabled'
    );
  });
});
