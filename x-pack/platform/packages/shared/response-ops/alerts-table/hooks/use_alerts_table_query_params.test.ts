/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { UseAlertsTableQueryParamsOptions } from './use_alerts_table_query_params';
import { useAlertsTableQueryParams } from './use_alerts_table_query_params';
import { BulkActionsVerbs } from '../types';

const mockDispatchBulkAction = jest.fn();
const mockSetPageIndex = jest.fn();
const defaultOptions: UseAlertsTableQueryParamsOptions = {
  ruleTypeIds: ['ruleType1'],
  consumers: ['consumer1'],
  fields: [{ field: 'field1', include_unmapped: false }],
  query: {},
  sort: [],
  runtimeMappings: {},
  pageIndex: 2,
  pageSize: 20,
  minScore: undefined,
  trackScores: false,
  dispatchBulkAction: mockDispatchBulkAction,
  setPageIndex: mockSetPageIndex,
};
const changedOptions: Partial<UseAlertsTableQueryParamsOptions> = {
  ruleTypeIds: ['ruleType1', 'ruleType2'],
  consumers: ['consumer1', 'consumer2'],
  fields: [
    { field: 'field1', include_unmapped: false },
    { field: 'field2', include_unmapped: true },
  ],
  query: { bool: { must: { terms: { 'kibana.alert.rule.uuid': 'testruleuuid' } } } },
  sort: [{ timestamp: { order: 'asc' } }],
  runtimeMappings: { runtimeField: { type: 'keyword' } },
  trackScores: true,
  pageSize: 100,
};
const optionsTriggeringReset = [
  'ruleTypeIds',
  'consumers',
  'fields',
  'query',
  'sort',
  'runtimeMappings',
  'trackScores',
  'pageSize',
] as const;

describe('useAlertsTableQueryParams', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return all the query params', () => {
    const { result } = renderHook((options: UseAlertsTableQueryParamsOptions = defaultOptions) =>
      useAlertsTableQueryParams(options)
    );

    const { dispatchBulkAction, setPageIndex, ...expectedQueryParams } = defaultOptions;

    expect(result.current).toEqual(expectedQueryParams);
  });

  it.each(optionsTriggeringReset)(
    'should reset pagination and clear bulk actions when %s changes structurally',
    (changedOption) => {
      const { result, rerender } = renderHook(
        (options: UseAlertsTableQueryParamsOptions = defaultOptions) =>
          useAlertsTableQueryParams(options)
      );

      expect(result.current.pageIndex).toBe(2);

      // Simulate a query change
      rerender({
        ...defaultOptions,
        [changedOption]: changedOptions[changedOption]!,
      });

      expect(result.current.pageIndex).toBe(0);
      expect(mockDispatchBulkAction).toHaveBeenCalledWith({
        action: BulkActionsVerbs.clear,
      });
    }
  );

  it('should not reset pagination when options change reference but remain structurally identical', () => {
    const { result, rerender } = renderHook(
      (options: UseAlertsTableQueryParamsOptions = defaultOptions) =>
        useAlertsTableQueryParams(options)
    );

    expect(result.current.pageIndex).toBe(2);

    // Simulate a query change
    rerender({
      ...defaultOptions,
      ruleTypeIds: ['ruleType1'],
      consumers: ['consumer1'],
      fields: [{ field: 'field1', include_unmapped: false }],
      query: {},
      sort: [],
      runtimeMappings: {},
      pageIndex: 2,
      pageSize: 20,
      minScore: undefined,
      trackScores: false,
    });

    expect(result.current.pageIndex).toBe(2);
    expect(mockDispatchBulkAction).not.toHaveBeenCalled();
    expect(mockSetPageIndex).not.toHaveBeenCalled();
  });

  it('should reset pageIndex to 0 after filter change', () => {
    const { rerender } = renderHook((options: UseAlertsTableQueryParamsOptions = defaultOptions) =>
      useAlertsTableQueryParams(options)
    );

    rerender({
      ...defaultOptions,
      pageSize: 10,
    });

    rerender({
      ...defaultOptions,
      query: { ids: { values: ['some_id'] } },
    });

    expect(mockSetPageIndex).toHaveBeenCalledTimes(2);
    expect(mockSetPageIndex).toHaveBeenCalledWith(0);
  });

  it('should reset pageIndex when filters are applied', () => {
    const highPageOptions = { ...defaultOptions, pageIndex: 5 };
    const { rerender } = renderHook((options: UseAlertsTableQueryParamsOptions = highPageOptions) =>
      useAlertsTableQueryParams(options)
    );

    rerender({
      ...highPageOptions,
      query: changedOptions.query!,
    });

    expect(mockSetPageIndex).toHaveBeenCalledWith(0);
  });
});
