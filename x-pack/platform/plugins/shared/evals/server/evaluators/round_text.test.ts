/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { collectRoundText } from './round_text';

describe('collectRoundText', () => {
  it('joins the response and tool-call arguments, skipping results and the input', () => {
    expect(
      collectRoundText({
        input: { message: 'the eval prompt' },
        steps: [
          { tool_id: 'a', arguments: { q: 1 }, result: 'read-only data' },
          { tool_id: 'b', arguments: 'raw args' },
          { tool_id: 'c' },
        ],
        response: { message: 'final answer' },
      })
    ).toBe('final answer\n\nq: 1\n\nraw args');
  });

  it('drops a BOM leading any part but keeps one inside it', () => {
    expect(
      collectRoundText({
        input: { message: 'q' },
        steps: [{ tool_id: 'a', arguments: '\uFEFFargs' }],
        response: { message: '\uFEFFanswer\uFEFFtail' },
      })
    ).toBe('answer\uFEFFtail\n\nargs');
  });

  it('flattens nested and JSON-string arguments, keeping real newlines', () => {
    expect(
      collectRoundText({
        input: { message: 'q' },
        steps: [
          { tool_id: 'a', arguments: { query: 'FROM a\n| LIMIT 1', opts: { tags: ['x', 'y'] } } },
          { tool_id: 'b', arguments: '{"query":"FROM b\\n| LIMIT 1"}' },
        ],
        response: { message: 'done' },
      })
    ).toBe(
      'done\n\nquery: FROM a\n| LIMIT 1\n\nopts.tags: x\n\nopts.tags: y\n\nquery: FROM b\n| LIMIT 1'
    );
  });
});
