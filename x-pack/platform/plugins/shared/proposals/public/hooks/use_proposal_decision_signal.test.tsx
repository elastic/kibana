/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { proposalDecisionSignal } from './proposal_decision_signal';
import { useProposalDecisionSignal } from './use_proposal_decision_signal';

const renderWithOwnClient = () => {
  const queryClient = new QueryClient();
  const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const rendered = renderHook(() => useProposalDecisionSignal(), { wrapper });
  return { ...rendered, invalidateSpy };
};

describe('useProposalDecisionSignal', () => {
  it('does not invalidate on mount', () => {
    const { invalidateSpy } = renderWithOwnClient();
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("invalidates this hook's own QueryClient once the signal bumps", () => {
    const { invalidateSpy } = renderWithOwnClient();

    act(() => {
      proposalDecisionSignal.bump();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['proposals'] });
  });

  it('does not invalidate again on a render with no new bump', () => {
    const { rerender, invalidateSpy } = renderWithOwnClient();
    rerender();
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("invalidates every subscribed host's own QueryClient, not just one", () => {
    const first = renderWithOwnClient();
    const second = renderWithOwnClient();

    act(() => {
      proposalDecisionSignal.bump();
    });

    expect(first.invalidateSpy).toHaveBeenCalledWith({ queryKey: ['proposals'] });
    expect(second.invalidateSpy).toHaveBeenCalledWith({ queryKey: ['proposals'] });
  });
});
