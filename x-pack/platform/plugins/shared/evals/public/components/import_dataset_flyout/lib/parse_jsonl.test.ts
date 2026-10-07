/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseJsonl } from './parse_jsonl';

describe('parseJsonl', () => {
  it('parses object lines and returns the union of their top-level keys', () => {
    expect(parseJsonl('{"question":"one"}\n\n{"answer":"two","score":1}')).toEqual({
      columns: ['question', 'answer', 'score'],
      rows: [
        { rowNumber: 1, values: { question: 'one' } },
        { rowNumber: 3, values: { answer: 'two', score: 1 } },
      ],
      errors: [],
    });
  });

  it('reports malformed JSON and non-object lines without returning them as rows', () => {
    const result = parseJsonl('{"valid":true}\nnot json\n[1,2]\nnull');

    expect(result.rows).toEqual([{ rowNumber: 1, values: { valid: true } }]);
    expect(result.errors).toEqual([
      { rowNumber: 2, message: expect.any(String) },
      { rowNumber: 3, message: 'Expected a JSON object.' },
      { rowNumber: 4, message: 'Expected a JSON object.' },
    ]);
  });
});
