/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook, act } from '@testing-library/react';
import { useHistory } from 'react-router-dom';

import { useUrlParams } from '../../../../../../../hooks';

import { STATUS_DEPRECATED, SETUP_METHOD_AGENTLESS, SETUP_METHOD_ELASTIC_AGENT } from '../types';
import { dataTypes } from '../../../../../../../../common/constants';

import { useAddUrlFilters, useUrlFilters } from './url_filters';

vi.mock('react-router-dom', () => {
      const mocked = {
      useHistory: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../../../../hooks', () => {
      const mocked = {
      useUrlParams: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

describe('useUrlFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns undefined for status when not in URL', () => {
    (useUrlParams as Mock).mockReturnValue({
      urlParams: {},
      toUrlParams: vi.fn(),
    });

    const { result } = renderHook(() => useUrlFilters());

    expect(result.current.status).toBeUndefined();
  });

  it('returns STATUS_DEPRECATED when status=deprecated in URL', () => {
    (useUrlParams as Mock).mockReturnValue({
      urlParams: { status: 'deprecated' },
      toUrlParams: vi.fn(),
    });

    const { result } = renderHook(() => useUrlFilters());

    expect(result.current.status).toEqual([STATUS_DEPRECATED]);
  });

  it('ignores invalid status values', () => {
    (useUrlParams as Mock).mockReturnValue({
      urlParams: { status: 'invalid' },
      toUrlParams: vi.fn(),
    });

    const { result } = renderHook(() => useUrlFilters());

    expect(result.current.status).toBeUndefined();
  });

  it('filters out invalid values from array', () => {
    (useUrlParams as Mock).mockReturnValue({
      urlParams: { status: ['invalid', STATUS_DEPRECATED] },
      toUrlParams: vi.fn(),
    });

    const { result } = renderHook(() => useUrlFilters());

    expect(result.current.status).toEqual([STATUS_DEPRECATED]);
  });

  it('parses search query from URL', () => {
    (useUrlParams as Mock).mockReturnValue({
      urlParams: { q: 'apache' },
      toUrlParams: vi.fn(),
    });

    const { result } = renderHook(() => useUrlFilters());

    expect(result.current.q).toBe('apache');
  });

  it('parses sort parameter from URL', () => {
    (useUrlParams as Mock).mockReturnValue({
      urlParams: { sort: 'a-z' },
      toUrlParams: vi.fn(),
    });

    const { result } = renderHook(() => useUrlFilters());

    expect(result.current.sort).toBe('a-z');
  });

  it('returns undefined for setupMethod when not in URL', () => {
    (useUrlParams as Mock).mockReturnValue({
      urlParams: {},
      toUrlParams: vi.fn(),
    });

    const { result } = renderHook(() => useUrlFilters());

    expect(result.current.setupMethod).toBeUndefined();
  });

  it('parses single setupMethod from URL', () => {
    (useUrlParams as Mock).mockReturnValue({
      urlParams: { setupMethod: 'agentless' },
      toUrlParams: vi.fn(),
    });

    const { result } = renderHook(() => useUrlFilters());

    expect(result.current.setupMethod).toEqual([SETUP_METHOD_AGENTLESS]);
  });

  it('parses setupMethod array from URL', () => {
    (useUrlParams as Mock).mockReturnValue({
      urlParams: { setupMethod: ['agentless', 'elastic_agent'] },
      toUrlParams: vi.fn(),
    });

    const { result } = renderHook(() => useUrlFilters());

    expect(result.current.setupMethod).toEqual([
      SETUP_METHOD_AGENTLESS,
      SETUP_METHOD_ELASTIC_AGENT,
    ]);
  });

  it('ignores invalid setupMethod values', () => {
    (useUrlParams as Mock).mockReturnValue({
      urlParams: { setupMethod: 'invalid' },
      toUrlParams: vi.fn(),
    });

    const { result } = renderHook(() => useUrlFilters());

    expect(result.current.setupMethod).toBeUndefined();
  });

  it('filters out invalid setupMethod values from array', () => {
    (useUrlParams as Mock).mockReturnValue({
      urlParams: { setupMethod: ['invalid', 'agentless'] },
      toUrlParams: vi.fn(),
    });

    const { result } = renderHook(() => useUrlFilters());

    expect(result.current.setupMethod).toEqual([SETUP_METHOD_AGENTLESS]);
  });

  it('returns undefined for signal when not in URL', () => {
    (useUrlParams as Mock).mockReturnValue({
      urlParams: {},
      toUrlParams: vi.fn(),
    });

    const { result } = renderHook(() => useUrlFilters());

    expect(result.current.signal).toBeUndefined();
  });

  it('parses single signal from URL', () => {
    (useUrlParams as Mock).mockReturnValue({
      urlParams: { signal: 'logs' },
      toUrlParams: vi.fn(),
    });

    const { result } = renderHook(() => useUrlFilters());

    expect(result.current.signal).toEqual([dataTypes.Logs]);
  });

  it('parses signal array from URL', () => {
    (useUrlParams as Mock).mockReturnValue({
      urlParams: { signal: ['logs', 'metrics'] },
      toUrlParams: vi.fn(),
    });

    const { result } = renderHook(() => useUrlFilters());

    expect(result.current.signal).toEqual([dataTypes.Logs, dataTypes.Metrics]);
  });

  it('ignores invalid signal values', () => {
    (useUrlParams as Mock).mockReturnValue({
      urlParams: { signal: 'invalid' },
      toUrlParams: vi.fn(),
    });

    const { result } = renderHook(() => useUrlFilters());

    expect(result.current.signal).toBeUndefined();
  });

  it('filters out invalid signal values from array', () => {
    (useUrlParams as Mock).mockReturnValue({
      urlParams: { signal: ['invalid', 'logs'] },
      toUrlParams: vi.fn(),
    });

    const { result } = renderHook(() => useUrlFilters());

    expect(result.current.signal).toEqual([dataTypes.Logs]);
  });

  it('parses single traces signal from URL', () => {
    (useUrlParams as Mock).mockReturnValue({
      urlParams: { signal: 'traces' },
      toUrlParams: vi.fn(),
    });

    const { result } = renderHook(() => useUrlFilters());

    expect(result.current.signal).toEqual([dataTypes.Traces]);
  });

  it('parses signal array with traces from URL', () => {
    (useUrlParams as Mock).mockReturnValue({
      urlParams: { signal: ['logs', 'metrics', 'traces'] },
      toUrlParams: vi.fn(),
    });

    const { result } = renderHook(() => useUrlFilters());

    expect(result.current.signal).toEqual([dataTypes.Logs, dataTypes.Metrics, dataTypes.Traces]);
  });

  it('returns undefined for showContent when not in URL', () => {
    (useUrlParams as Mock).mockReturnValue({
      urlParams: {},
      toUrlParams: vi.fn(),
    });

    const { result } = renderHook(() => useUrlFilters());

    expect(result.current.showContent).toBeUndefined();
  });

  it('returns true for showContent when showContent=true in URL', () => {
    (useUrlParams as Mock).mockReturnValue({
      urlParams: { showContent: 'true' },
      toUrlParams: vi.fn(),
    });

    const { result } = renderHook(() => useUrlFilters());

    expect(result.current.showContent).toBe(true);
  });

  it('returns undefined for showContent when value is not "true"', () => {
    (useUrlParams as Mock).mockReturnValue({
      urlParams: { showContent: 'false' },
      toUrlParams: vi.fn(),
    });

    const { result } = renderHook(() => useUrlFilters());

    expect(result.current.showContent).toBeUndefined();
  });
});

describe('useAddUrlFilters', () => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();
  const mockToUrlParams = vi.fn((params) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => searchParams.append(key, v as string));
      } else {
        searchParams.append(key, value as string);
      }
    });
    return searchParams.toString();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (useHistory as Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });
    (useUrlParams as Mock).mockReturnValue({
      urlParams: {},
      toUrlParams: mockToUrlParams,
    });
  });

  it('adds status=deprecated to URL when set', () => {
    const { result } = renderHook(() => useAddUrlFilters());

    act(() => {
      result.current({ status: ['deprecated'] });
    });

    expect(mockPush).toHaveBeenCalledWith({
      search: 'status=deprecated',
    });
  });

  it('removes status from URL when set to undefined', () => {
    (useUrlParams as Mock).mockReturnValue({
      urlParams: { status: 'deprecated' },
      toUrlParams: mockToUrlParams,
    });

    const { result } = renderHook(() => useAddUrlFilters());

    act(() => {
      result.current({ status: undefined });
    });

    expect(mockPush).toHaveBeenCalledWith({
      search: '',
    });
  });

  it('removes status from URL when set to empty array', () => {
    (useUrlParams as Mock).mockReturnValue({
      urlParams: { status: 'deprecated' },
      toUrlParams: mockToUrlParams,
    });

    const { result } = renderHook(() => useAddUrlFilters());

    act(() => {
      result.current({ status: [] });
    });

    expect(mockPush).toHaveBeenCalledWith({
      search: '',
    });
  });

  it('preserves search query when updating filters', () => {
    (useUrlParams as Mock).mockReturnValue({
      urlParams: { q: 'apache' },
      toUrlParams: mockToUrlParams,
    });

    const { result } = renderHook(() => useAddUrlFilters());

    act(() => {
      result.current({ status: ['deprecated'] });
    });

    expect(mockPush).toHaveBeenCalledWith({
      search: expect.stringContaining('q=apache'),
    });
    expect(mockPush).toHaveBeenCalledWith({
      search: expect.stringContaining('status=deprecated'),
    });
  });

  it('uses replace instead of push when replace option is true', () => {
    const { result } = renderHook(() => useAddUrlFilters());

    act(() => {
      result.current({ status: ['deprecated'] }, { replace: true });
    });

    expect(mockReplace).toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('adds setupMethod to URL when set', () => {
    const { result } = renderHook(() => useAddUrlFilters());

    act(() => {
      result.current({ setupMethod: ['agentless'] });
    });

    expect(mockPush).toHaveBeenCalledWith({
      search: 'setupMethod=agentless',
    });
  });

  it('adds multiple setupMethod values to URL', () => {
    const { result } = renderHook(() => useAddUrlFilters());

    act(() => {
      result.current({ setupMethod: ['agentless', 'elastic_agent'] });
    });

    expect(mockPush).toHaveBeenCalledWith({
      search: expect.stringContaining('setupMethod=agentless'),
    });
    expect(mockPush).toHaveBeenCalledWith({
      search: expect.stringContaining('setupMethod=elastic_agent'),
    });
  });

  it('removes setupMethod from URL when set to undefined', () => {
    (useUrlParams as Mock).mockReturnValue({
      urlParams: { setupMethod: 'agentless' },
      toUrlParams: mockToUrlParams,
    });

    const { result } = renderHook(() => useAddUrlFilters());

    act(() => {
      result.current({ setupMethod: undefined });
    });

    expect(mockPush).toHaveBeenCalledWith({
      search: '',
    });
  });

  it('removes setupMethod from URL when set to empty array', () => {
    (useUrlParams as Mock).mockReturnValue({
      urlParams: { setupMethod: 'agentless' },
      toUrlParams: mockToUrlParams,
    });

    const { result } = renderHook(() => useAddUrlFilters());

    act(() => {
      result.current({ setupMethod: [] });
    });

    expect(mockPush).toHaveBeenCalledWith({
      search: '',
    });
  });

  it('preserves other filters when updating setupMethod', () => {
    (useUrlParams as Mock).mockReturnValue({
      urlParams: { q: 'apache', status: 'deprecated' },
      toUrlParams: mockToUrlParams,
    });

    const { result } = renderHook(() => useAddUrlFilters());

    act(() => {
      result.current({ setupMethod: ['agentless'] });
    });

    expect(mockPush).toHaveBeenCalledWith({
      search: expect.stringContaining('q=apache'),
    });
    expect(mockPush).toHaveBeenCalledWith({
      search: expect.stringContaining('status=deprecated'),
    });
    expect(mockPush).toHaveBeenCalledWith({
      search: expect.stringContaining('setupMethod=agentless'),
    });
  });

  it('adds signal to URL when set', () => {
    const { result } = renderHook(() => useAddUrlFilters());

    act(() => {
      result.current({ signal: ['logs'] });
    });

    expect(mockPush).toHaveBeenCalledWith({
      search: 'signal=logs',
    });
  });

  it('adds multiple signal values to URL', () => {
    const { result } = renderHook(() => useAddUrlFilters());

    act(() => {
      result.current({ signal: ['logs', 'metrics'] });
    });

    expect(mockPush).toHaveBeenCalledWith({
      search: expect.stringContaining('signal=logs'),
    });
    expect(mockPush).toHaveBeenCalledWith({
      search: expect.stringContaining('signal=metrics'),
    });
  });

  it('removes signal from URL when set to undefined', () => {
    (useUrlParams as Mock).mockReturnValue({
      urlParams: { signal: 'logs' },
      toUrlParams: mockToUrlParams,
    });

    const { result } = renderHook(() => useAddUrlFilters());

    act(() => {
      result.current({ signal: undefined });
    });

    expect(mockPush).toHaveBeenCalledWith({
      search: '',
    });
  });

  it('removes signal from URL when set to empty array', () => {
    (useUrlParams as Mock).mockReturnValue({
      urlParams: { signal: 'logs' },
      toUrlParams: mockToUrlParams,
    });

    const { result } = renderHook(() => useAddUrlFilters());

    act(() => {
      result.current({ signal: [] });
    });

    expect(mockPush).toHaveBeenCalledWith({
      search: '',
    });
  });

  it('preserves other filters when updating signal', () => {
    (useUrlParams as Mock).mockReturnValue({
      urlParams: { q: 'apache', status: 'deprecated', setupMethod: 'agentless' },
      toUrlParams: mockToUrlParams,
    });

    const { result } = renderHook(() => useAddUrlFilters());

    act(() => {
      result.current({ signal: ['logs'] });
    });

    expect(mockPush).toHaveBeenCalledWith({
      search: expect.stringContaining('q=apache'),
    });
    expect(mockPush).toHaveBeenCalledWith({
      search: expect.stringContaining('status=deprecated'),
    });
    expect(mockPush).toHaveBeenCalledWith({
      search: expect.stringContaining('setupMethod=agentless'),
    });
    expect(mockPush).toHaveBeenCalledWith({
      search: expect.stringContaining('signal=logs'),
    });
  });

  it('adds showContent=true to URL when showContent is true', () => {
    const { result } = renderHook(() => useAddUrlFilters());

    act(() => {
      result.current({ showContent: true });
    });

    expect(mockPush).toHaveBeenCalledWith({
      search: 'showContent=true',
    });
  });

  it('removes showContent from URL when showContent is undefined', () => {
    (useUrlParams as Mock).mockReturnValue({
      urlParams: { showContent: 'true' },
      toUrlParams: mockToUrlParams,
    });

    const { result } = renderHook(() => useAddUrlFilters());

    act(() => {
      result.current({ showContent: undefined });
    });

    expect(mockPush).toHaveBeenCalledWith({
      search: '',
    });
  });

  it('preserves other filters when toggling showContent', () => {
    (useUrlParams as Mock).mockReturnValue({
      urlParams: { q: 'apache', status: 'deprecated' },
      toUrlParams: mockToUrlParams,
    });

    const { result } = renderHook(() => useAddUrlFilters());

    act(() => {
      result.current({ showContent: true });
    });

    expect(mockPush).toHaveBeenCalledWith({
      search: expect.stringContaining('q=apache'),
    });
    expect(mockPush).toHaveBeenCalledWith({
      search: expect.stringContaining('status=deprecated'),
    });
    expect(mockPush).toHaveBeenCalledWith({
      search: expect.stringContaining('showContent=true'),
    });
  });
});
