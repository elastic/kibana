/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { getESQLSources, getEsqlColumns } from '@kbn/esql-utils';
import { useEsqlCallbacks } from './use_esql_callbacks';

jest.mock('@kbn/esql-utils');

const mockGetESQLSources = jest.mocked(getESQLSources);
const mockGetEsqlColumns = jest.mocked(getEsqlColumns);

describe('useEsqlCallbacks', () => {
  const mockSearch = jest.fn();
  let http: ReturnType<typeof httpServiceMock.createStartContract>;
  let application: ReturnType<typeof applicationServiceMock.createStartContract>;

  beforeEach(() => {
    jest.clearAllMocks();
    http = httpServiceMock.createStartContract();
    application = applicationServiceMock.createStartContract();
  });

  it('returns esqlCallbacks with getSources and getColumnsFor', () => {
    const { result } = renderHook(() =>
      useEsqlCallbacks({
        application,
        http,
        search: mockSearch,
      })
    );

    expect(result.current).toHaveProperty('getSources');
    expect(result.current).toHaveProperty('getColumnsFor');
    expect(typeof result.current.getSources).toBe('function');
    expect(typeof result.current.getColumnsFor).toBe('function');
  });

  it('getSources calls getESQLSources with correct parameters', async () => {
    const mockSources = [{ name: 'logs-*', hidden: false }];
    mockGetESQLSources.mockResolvedValue(mockSources);

    const { result } = renderHook(() =>
      useEsqlCallbacks({
        application,
        http,
        search: mockSearch,
      })
    );

    const sources = await result.current.getSources!();

    expect(mockGetESQLSources).toHaveBeenCalledWith({ application, http }, undefined);
    expect(sources).toEqual(mockSources);
  });

  it('getColumnsFor calls getEsqlColumns with correct parameters', async () => {
    const mockColumns = [
      { name: '@timestamp', type: 'date', userDefined: false as const },
      { name: 'message', type: 'text', userDefined: false as const },
    ];
    mockGetEsqlColumns.mockResolvedValue(mockColumns);

    const { result } = renderHook(() =>
      useEsqlCallbacks({
        application,
        http,
        search: mockSearch,
      })
    );

    const query = 'FROM logs-* | LIMIT 10';
    const columns = await result.current.getColumnsFor!({ query });

    expect(mockGetEsqlColumns).toHaveBeenCalledWith({
      esqlQuery: query,
      search: mockSearch,
    });
    expect(columns).toEqual(mockColumns);
  });

  it('getColumnsFor handles undefined query parameter', async () => {
    const mockColumns: Array<{ name: string; type: string; userDefined: false }> = [];
    mockGetEsqlColumns.mockResolvedValue(mockColumns);

    const { result } = renderHook(() =>
      useEsqlCallbacks({
        application,
        http,
        search: mockSearch,
      })
    );

    await result.current.getColumnsFor!();

    expect(mockGetEsqlColumns).toHaveBeenCalledWith({
      esqlQuery: undefined,
      search: mockSearch,
    });
  });

  it('memoizes callbacks when dependencies do not change', () => {
    const { result, rerender } = renderHook(() =>
      useEsqlCallbacks({
        application,
        http,
        search: mockSearch,
      })
    );

    const firstCallbacks = result.current;

    rerender();

    expect(result.current).toBe(firstCallbacks);
  });

  it('creates new callbacks when dependencies change', () => {
    const { result, rerender } = renderHook(
      ({ search }) =>
        useEsqlCallbacks({
          application,
          http,
          search,
        }),
      { initialProps: { search: mockSearch } }
    );

    const firstCallbacks = result.current;

    const newMockSearch = jest.fn();
    rerender({ search: newMockSearch });

    expect(result.current).not.toBe(firstCallbacks);
  });

  it('handles errors from getSources gracefully', async () => {
    const testError = new Error('Failed to fetch sources');
    mockGetESQLSources.mockRejectedValue(testError);

    const { result } = renderHook(() =>
      useEsqlCallbacks({
        application,
        http,
        search: mockSearch,
      })
    );

    await expect(result.current.getSources!()).rejects.toThrow('Failed to fetch sources');
  });

  it('handles errors from getColumnsFor gracefully', async () => {
    const testError = new Error('Failed to fetch columns');
    mockGetEsqlColumns.mockRejectedValue(testError);

    const { result } = renderHook(() =>
      useEsqlCallbacks({
        application,
        http,
        search: mockSearch,
      })
    );

    await expect(result.current.getColumnsFor!({ query: 'FROM logs-*' })).rejects.toThrow(
      'Failed to fetch columns'
    );
  });
});
