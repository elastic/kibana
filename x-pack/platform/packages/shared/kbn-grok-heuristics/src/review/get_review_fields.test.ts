/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GrokPatternNode } from '../types';
import { getReviewFields } from './get_review_fields';

describe('getReviewFields', () => {
  it('returns only named fields without literal values', () => {
    const grokPatternNodes: GrokPatternNode[] = [
      {
        id: 'field_1',
        component: 'WORD',
        values: ['value1', 'value2', 'value3'],
      },
      { pattern: '-' },
      {
        id: 'field_2',
        component: 'INT',
        values: ['1', '2', '3'],
      },
    ];
    const reviewFields = getReviewFields(grokPatternNodes, 5);
    expect(reviewFields).toEqual({
      field_1: { grok_component: 'WORD', example_values: ['value1', 'value2', 'value3'] },
      field_2: { grok_component: 'INT', example_values: ['1', '2', '3'] },
    });
  });
});
