/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react';

import { useCaseRefreshRef } from './use_case_refresh_ref';
import { TestProviders } from '../../../../common/mock';

const mockRefreshCaseViewPage = jest.fn();

jest.mock('../../../case_view/use_on_refresh_case_view_page', () => ({
  useRefreshCaseViewPage: () => mockRefreshCaseViewPage,
}));

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(TestProviders, null, children);

describe('useCaseRefreshRef', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('assigns refreshCase to ref.current', () => {
    const refreshRef = { current: null } as React.MutableRefObject<{
      refreshCase: () => Promise<void>;
    } | null>;

    renderHook(() => useCaseRefreshRef({ refreshRef, isLoading: false }), { wrapper });

    expect(refreshRef.current).not.toBeNull();
    expect(refreshRef.current!.refreshCase).toBeInstanceOf(Function);
  });

  it('calls refreshCaseViewPage when refreshCase is invoked and not loading', async () => {
    const refreshRef = { current: null } as React.MutableRefObject<{
      refreshCase: () => Promise<void>;
    } | null>;

    renderHook(() => useCaseRefreshRef({ refreshRef, isLoading: false }), { wrapper });

    await refreshRef.current!.refreshCase();

    expect(mockRefreshCaseViewPage).toHaveBeenCalledTimes(1);
  });

  it('does not call refreshCaseViewPage when isLoading is true', async () => {
    const refreshRef = { current: null } as React.MutableRefObject<{
      refreshCase: () => Promise<void>;
    } | null>;

    renderHook(() => useCaseRefreshRef({ refreshRef, isLoading: true }), { wrapper });

    await refreshRef.current!.refreshCase();

    expect(mockRefreshCaseViewPage).not.toHaveBeenCalled();
  });

  it('nullifies ref.current on unmount', () => {
    const refreshRef = { current: null } as React.MutableRefObject<{
      refreshCase: () => Promise<void>;
    } | null>;

    const { unmount } = renderHook(() => useCaseRefreshRef({ refreshRef, isLoading: false }), {
      wrapper,
    });

    expect(refreshRef.current).not.toBeNull();

    unmount();

    expect(refreshRef.current).toBeNull();
  });

  it('does not throw when refreshRef is undefined', () => {
    expect(() => {
      renderHook(() => useCaseRefreshRef({ refreshRef: undefined, isLoading: false }), {
        wrapper,
      });
    }).not.toThrow();
  });
});
