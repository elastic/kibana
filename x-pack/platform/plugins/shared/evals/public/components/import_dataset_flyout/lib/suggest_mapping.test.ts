/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { suggestMapping } from './suggest_mapping';

describe('suggestMapping', () => {
  it('suggests input, output, and metadata mappings case-insensitively', () => {
    expect(
      suggestMapping([
        'Input',
        'question',
        'prompt',
        'query',
        'Output',
        'answer',
        'expected',
        'reference',
        'ground_truth',
        'completion',
        'category',
      ])
    ).toEqual({
      Input: 'input',
      question: 'input',
      prompt: 'input',
      query: 'input',
      Output: 'output',
      answer: 'output',
      expected: 'output',
      reference: 'output',
      ground_truth: 'output',
      completion: 'output',
      category: 'metadata',
    });
  });
});
