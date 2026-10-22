/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderDatatablePanel } from './datatable_panel';

describe('renderDatatablePanel (Spike E, Tier 3)', () => {
  const table = {
    columns: [
      { id: 'name', name: 'Name' },
      { id: 'count', name: 'Count' },
    ],
    rows: [
      { name: 'foo', count: 3 },
      { name: '<b>bar</b>', count: 5 },
    ],
  };

  it('renders a header row from the columns and one <tr> per row', () => {
    const html = renderDatatablePanel(table);
    expect(html).toContain('<th>Name</th>');
    expect(html).toContain('<th>Count</th>');
    expect(html).toContain('<td>foo</td><td>3</td>');
  });

  it('escapes cell values by default', () => {
    expect(renderDatatablePanel(table)).toContain('&lt;b&gt;bar&lt;/b&gt;');
  });

  it('uses a custom cellFormatter when provided (Spike B fieldFormats integration point)', () => {
    const html = renderDatatablePanel(table, {
      cellFormatter: (value) => `[${String(value)}]`,
    });
    expect(html).toContain('<td>[foo]</td><td>[3]</td>');
  });
});
