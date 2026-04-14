/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import {
  usePersistedPageSize,
  PAGE_SIZE_OPTIONS,
  DEFAULT_PAGE_SIZE,
} from './use_persisted_page_size';

const STORAGE_KEY = 'osquery:pageSize';

describe('usePersistedPageSize', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  afterAll(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('returns default page size when no stored value exists', () => {
    const { result } = renderHook(() => usePersistedPageSize());

    expect(result.current[0]).toBe(DEFAULT_PAGE_SIZE);
  });

  it('returns stored value when it is a valid option', () => {
    localStorage.setItem(STORAGE_KEY, '50');

    const { result } = renderHook(() => usePersistedPageSize());

    expect(result.current[0]).toBe(50);
  });

  it('falls back to default when stored value is invalid (e.g. 20)', () => {
    localStorage.setItem(STORAGE_KEY, '20');

    const { result } = renderHook(() => usePersistedPageSize());

    expect(result.current[0]).toBe(DEFAULT_PAGE_SIZE);
  });

  it('falls back to default when stored value is corrupted', () => {
    localStorage.setItem(STORAGE_KEY, '"garbage"');

    const { result } = renderHook(() => usePersistedPageSize());

    expect(result.current[0]).toBe(DEFAULT_PAGE_SIZE);
  });

  it('setPageSize updates stored value', () => {
    const { result } = renderHook(() => usePersistedPageSize());

    act(() => {
      result.current[1](100);
    });

    expect(result.current[0]).toBe(100);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('100');
  });

  it('setPageSize ignores invalid values', () => {
    const { result } = renderHook(() => usePersistedPageSize());

    act(() => {
      result.current[1](20);
    });

    expect(result.current[0]).toBe(DEFAULT_PAGE_SIZE);
  });

  it('exports the expected page size options', () => {
    expect(PAGE_SIZE_OPTIONS).toEqual([10, 25, 50, 100]);
  });

  it('exports the expected default page size', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(10);
  });
});
