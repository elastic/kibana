/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyzeAndImproveContext, SuggestAutomationProvider } from '../../types';
import { analyzeAndImprove } from './analyze_and_improve';

const suggestAutomationProvider: SuggestAutomationProvider = {
  canSuggest: () => false,
  suggestAutomation: jest.fn(),
  subscribeToAutomationSaved: () => () => {},
};

describe('analyzeAndImprove', () => {
  const context = { aiIndex: { id: 'idx' } } as unknown as AnalyzeAndImproveContext;

  it('resolves the provider via the getter and invokes analyzeAndImprove with the context', () => {
    const analyzeAndImproveMock = jest.fn();
    const provider = {
      canAnalyze: () => true,
      analyzeAndImprove: analyzeAndImproveMock,
    };

    analyzeAndImprove(
      () => ({
        analyzeAndImprove: provider,
        suggestAutomation: suggestAutomationProvider,
      }),
      context
    );

    expect(analyzeAndImproveMock).toHaveBeenCalledWith(context);
  });

  it('is a no-op when no integration is registered', () => {
    expect(() => analyzeAndImprove(undefined, context)).not.toThrow();
  });
});
