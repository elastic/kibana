/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyMapping } from './apply_mapping';

describe('applyMapping', () => {
  it('groups mapped columns and drops ignored columns', () => {
    expect(
      applyMapping(
        [
          {
            rowNumber: 7,
            values: { question: 'Why?', context: 'Kibana', answer: 'Because', unused: 42 },
          },
        ],
        { question: 'input', context: 'input', answer: 'output', unused: 'ignore' }
      )
    ).toEqual({
      examples: [
        {
          input: { question: 'Why?', context: 'Kibana' },
          output: { answer: 'Because' },
        },
      ],
      errors: [],
    });
  });

  it('reports rows whose mapped values are entirely empty', () => {
    expect(
      applyMapping([{ rowNumber: 12, values: { question: '  ', answer: null, note: 'ignored' } }], {
        question: 'input',
        answer: 'output',
        note: 'ignore',
      })
    ).toEqual({
      examples: [],
      errors: [{ rowNumber: 12, message: 'The row has no mapped values.' }],
    });
  });

  it('keeps false and zero as mapped values', () => {
    expect(
      applyMapping([{ rowNumber: 1, values: { enabled: false, score: 0 } }], {
        enabled: 'input',
        score: 'metadata',
      }).examples
    ).toEqual([{ input: { enabled: false }, metadata: { score: 0 } }]);
  });
});
