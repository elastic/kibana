/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseCsv } from './parse_csv';

describe('parseCsv', () => {
  it('parses headers and dynamically types primitive values', () => {
    expect(parseCsv('question,score,enabled\nWhat is Kibana?,42,true')).toEqual({
      columns: ['question', 'score', 'enabled'],
      rows: [
        {
          rowNumber: 1,
          values: { question: 'What is Kibana?', score: 42, enabled: true },
        },
      ],
      errors: [],
    });
  });

  it('coerces object and array cells from JSON and leaves invalid JSON as a string', () => {
    const result = parseCsv(
      'input,metadata,invalid\n"{""question"":""hello""}","[1,2]","{not json}"'
    );

    expect(result.rows[0].values).toEqual({
      input: { question: 'hello' },
      metadata: [1, 2],
      invalid: '{not json}',
    });
  });

  it('reports and excludes a malformed row', () => {
    const result = parseCsv('question,answer\nvalid,yes\ntoo,many,fields');

    expect(result.rows).toEqual([{ rowNumber: 1, values: { question: 'valid', answer: 'yes' } }]);
    expect(result.errors).toEqual([
      expect.objectContaining({ rowNumber: 2, message: expect.any(String) }),
    ]);
  });
});
