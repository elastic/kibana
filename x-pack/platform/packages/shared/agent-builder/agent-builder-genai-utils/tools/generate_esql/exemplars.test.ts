/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseExemplars, renderExemplars, selectExemplars } from './exemplars';

const corpus = `## ES|QL query examples

\`\`\`esql
// What are the 10 latest errors from the logs?
FROM logs
| WHERE level == "ERROR"
\`\`\`

\`\`\`esql
// How many employees are from the Netherlands?
FROM employees
| WHERE country == "NL"
\`\`\`

\`\`\`esql
// How many orders were placed each month over the last year?
FROM orders
| STATS count = COUNT(*)
\`\`\`
`;

describe('exemplars', () => {
  it('decomposes the corpus into blocks keyed by their comment', () => {
    const exemplars = parseExemplars(corpus);
    expect(exemplars).toHaveLength(3);
    expect(exemplars[0].title).toBe('What are the 10 latest errors from the logs?');
    expect(exemplars[0].block).toContain('FROM logs');
  });

  it('retrieves the exemplars that overlap the query', () => {
    const selected = selectExemplars(parseExemplars(corpus), 'how many employees do we have', 1);
    expect(selected).toHaveLength(1);
    expect(selected[0].title).toContain('employees');
  });

  it('preserves corpus order in the rendered selection', () => {
    const selected = selectExemplars(parseExemplars(corpus), 'orders and errors', 2);
    expect(renderExemplars(selected).indexOf('FROM logs')).toBeLessThan(
      renderExemplars(selected).indexOf('FROM orders')
    );
  });

  it('falls back to the first k exemplars for an empty query', () => {
    expect(selectExemplars(parseExemplars(corpus), '', 2)).toHaveLength(2);
  });
});
