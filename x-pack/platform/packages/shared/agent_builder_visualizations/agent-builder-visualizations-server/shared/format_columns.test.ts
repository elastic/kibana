/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatColumnsBlock } from './format_columns';

const QUERY = 'FROM logs-* | STATS count = COUNT(*) BY status';
const COLUMNS = [
  { name: 'count', type: 'long' },
  { name: 'status', type: 'keyword' },
];

describe('formatColumnsBlock', () => {
  it('wraps executed columns in the columns listing', () => {
    expect(formatColumnsBlock(COLUMNS, QUERY)).toBe(
      `Columns available in the data (reference these EXACT names):
<columns>
- "count" (long)
- "status" (keyword)
</columns>`
    );
  });

  it('lists an empty columns block when execute returned no columns', () => {
    expect(formatColumnsBlock([], QUERY)).toBe(
      `Columns available in the data (reference these EXACT names):
<columns>
</columns>`
    );
  });

  it('falls back to the query text only when columns were never executed', () => {
    expect(formatColumnsBlock(undefined, QUERY)).toBe(
      `No column information is available; infer fields from the ES|QL query: ${QUERY}`
    );
  });
});
