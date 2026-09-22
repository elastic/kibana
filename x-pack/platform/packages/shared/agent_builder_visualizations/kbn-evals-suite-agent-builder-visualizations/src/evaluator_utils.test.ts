/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { skippedResult } from './evaluator_utils';

describe('skippedResult', () => {
  it('returns a null score with the skipped label', () => {
    expect(skippedResult('nothing to check')).toEqual({
      score: null,
      label: 'skipped',
      explanation: 'nothing to check',
    });
  });
});
