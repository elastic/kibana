/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTaskTypeOptions, orderTaskTypes } from './helpers';

describe('orderTaskTypes', () => {
  it('moves chat_completion to the front while preserving the order of the rest', () => {
    expect(orderTaskTypes(['text_embedding', 'completion', 'chat_completion', 'rerank'])).toEqual([
      'chat_completion',
      'text_embedding',
      'completion',
      'rerank',
    ]);
  });

  it('returns the task types unchanged when chat_completion is not supported', () => {
    expect(orderTaskTypes(['text_embedding', 'sparse_embedding'])).toEqual([
      'text_embedding',
      'sparse_embedding',
    ]);
  });

  it('handles an empty list', () => {
    expect(orderTaskTypes([])).toEqual([]);
  });
});

describe('getTaskTypeOptions', () => {
  it('builds options with chat_completion first', () => {
    expect(getTaskTypeOptions(['completion', 'chat_completion'])).toEqual([
      { id: 'chat_completion', label: 'chat_completion', value: 'chat_completion' },
      { id: 'completion', label: 'completion', value: 'completion' },
    ]);
  });
});
