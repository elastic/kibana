/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useHistory } from 'react-router-dom';

import { useUrlParams } from '../../../../../../../hooks';

import { useAddUrlFilters, useUrlFilters } from './url_filters';

jest.mock('react-router-dom', () => ({
  useHistory: jest.fn(),
}));

jest.mock('../../../../../../../hooks', () => ({
  useUrlParams: jest.fn(),
}));

describe('useUrlFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns undefined for showBeta when not in URL', () => {
    (useUrlParams as jest.Mock).mockReturnValue({
      urlParams: {},
      toUrlParams: jest.fn(),
    });

    const { result } = renderHook(() => useUrlFilters());

    expect(result.current.showBeta).toBeUndefined();
  });

  it('returns true for showBeta when showBeta=true in URL', () => {
    (useUrlParams as jest.Mock).mockReturnValue({
      urlParams: { showBeta: 'true' },
      toUrlParams: jest.fn(),
    });

    const { result } = renderHook(() => useUrlFilters());

    expect(result.current.showBeta).toBe(true);
  });

  it('returns false for showBeta when showBeta=false in URL', () => {
    (useUrlParams as jest.Mock).mockReturnValue({
      urlParams: { showBeta: 'false' },
      toUrlParams: jest.fn(),
    });

    const { result } = renderHook(() => useUrlFilters());

    expect(result.current.showBeta).toBe(false);
  });

  it('returns undefined for showDeprecated when not in URL', () => {
    (useUrlParams as jest.Mock).mockReturnValue({
      urlParams: {},
      toUrlParams: jest.fn(),
    });

    const { result } = renderHook(() => useUrlFilters());

    expect(result.current.showDeprecated).toBeUndefined();
  });

  it('returns true for showDeprecated when showDeprecated=true in URL', () => {
    (useUrlParams as jest.Mock).mockReturnValue({
      urlParams: { showDeprecated: 'true' },
      toUrlParams: jest.fn(),
    });

    const { result } = renderHook(() => useUrlFilters());

    expect(result.current.showDeprecated).toBe(true);
  });

  it('parses search query from URL', () => {
    (useUrlParams as jest.Mock).mockReturnValue({
      urlParams: { q: 'apache' },
      toUrlParams: jest.fn(),
    });

    const { result } = renderHook(() => useUrlFilters());

    expect(result.current.q).toBe('apache');
  });

  it('parses sort parameter from URL', () => {
    (useUrlParams as jest.Mock).mockReturnValue({
      urlParams: { sort: 'a-z' },
      toUrlParams: jest.fn(),
    });

    const { result } = renderHook(() => useUrlFilters());

    expect(result.current.sort).toBe('a-z');
  });
});

describe('useAddUrlFilters', () => {
  const mockPush = jest.fn();
  const mockReplace = jest.fn();
  const mockToUrlParams = jest.fn((params) => new URLSearchParams(params).toString());

  beforeEach(() => {
    jest.clearAllMocks();
    (useHistory as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });
    (useUrlParams as jest.Mock).mockReturnValue({
      urlParams: {},
      toUrlParams: mockToUrlParams,
    });
  });

  it('adds showBeta=true to URL when set', () => {
    const { result } = renderHook(() => useAddUrlFilters());

    act(() => {
      result.current({ showBeta: true });
    });

    expect(mockPush).toHaveBeenCalledWith({
      search: 'showBeta=true',
    });
  });

  it('removes showBeta from URL when set to undefined', () => {
    (useUrlParams as jest.Mock).mockReturnValue({
      urlParams: { showBeta: 'true' },
      toUrlParams: mockToUrlParams,
    });

    const { result } = renderHook(() => useAddUrlFilters());

    act(() => {
      result.current({ showBeta: undefined });
    });

    expect(mockPush).toHaveBeenCalledWith({
      search: '',
    });
  });

  it('adds showDeprecated=true to URL when set', () => {
    const { result } = renderHook(() => useAddUrlFilters());

    act(() => {
      result.current({ showDeprecated: true });
    });

    expect(mockPush).toHaveBeenCalledWith({
      search: 'showDeprecated=true',
    });
  });

  it('removes showDeprecated from URL when set to undefined', () => {
    (useUrlParams as jest.Mock).mockReturnValue({
      urlParams: { showDeprecated: 'true' },
      toUrlParams: mockToUrlParams,
    });

    const { result } = renderHook(() => useAddUrlFilters());

    act(() => {
      result.current({ showDeprecated: undefined });
    });

    expect(mockPush).toHaveBeenCalledWith({
      search: '',
    });
  });

  it('handles both filters together', () => {
    const { result } = renderHook(() => useAddUrlFilters());

    act(() => {
      result.current({ showBeta: true, showDeprecated: true });
    });

    expect(mockPush).toHaveBeenCalledWith({
      search: 'showBeta=true&showDeprecated=true',
    });
  });

  it('preserves search query when updating filters', () => {
    (useUrlParams as jest.Mock).mockReturnValue({
      urlParams: { q: 'apache' },
      toUrlParams: mockToUrlParams,
    });

    const { result } = renderHook(() => useAddUrlFilters());

    act(() => {
      result.current({ showBeta: true });
    });

    expect(mockPush).toHaveBeenCalledWith({
      search: expect.stringContaining('q=apache'),
    });
    expect(mockPush).toHaveBeenCalledWith({
      search: expect.stringContaining('showBeta=true'),
    });
  });

  it('uses replace instead of push when replace option is true', () => {
    const { result } = renderHook(() => useAddUrlFilters());

    act(() => {
      result.current({ showBeta: true }, { replace: true });
    });

    expect(mockReplace).toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
