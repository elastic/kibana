/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyzeAndImproveContext } from '../../types';
import { analyzeAndImprove } from './analyze_and_improve';

describe('analyzeAndImprove', () => {
  const context = { aiIndex: { id: 'idx' } } as unknown as AnalyzeAndImproveContext;

  it('resolves the opener via the getter and invokes it with the context', () => {
    const opener = jest.fn();

    analyzeAndImprove(() => opener, context);

    expect(opener).toHaveBeenCalledWith(context);
  });

  it('is a no-op when no opener is registered', () => {
    expect(() => analyzeAndImprove(undefined, context)).not.toThrow();
  });
});
