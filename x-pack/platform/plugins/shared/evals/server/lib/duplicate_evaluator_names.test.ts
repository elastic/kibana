/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findDuplicateEvaluatorNames } from './duplicate_evaluator_names';

describe('findDuplicateEvaluatorNames', () => {
  it('finds nothing when every evaluator is named once', () => {
    expect(
      findDuplicateEvaluatorNames([{ name: 'correctness' }, { name: 'groundedness' }])
    ).toEqual([]);
  });

  it('reports each repeated name once, however many times it repeats', () => {
    expect(
      findDuplicateEvaluatorNames([
        { name: 'criteria' },
        { name: 'criteria' },
        { name: 'criteria' },
        { name: 'correctness' },
        { name: 'correctness' },
        { name: 'latency' },
      ])
    ).toEqual(['criteria', 'correctness']);
  });
});
