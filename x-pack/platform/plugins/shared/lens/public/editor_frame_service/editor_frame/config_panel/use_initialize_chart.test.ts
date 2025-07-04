/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AggregateQuery, Query } from '@kbn/es-query';
import {
  createInitializeChartFunction,
  type InitializeChartLogicArgs,
} from './use_initialize_chart';
import { TypedLensSerializedState } from '../../../react_embeddable/types';

describe('createInitializeChartFunction', () => {
  let mockSetErrors: jest.Mock;
  let mockSetIsInitialized: jest.Mock;
  let mockRunQuery: jest.Mock;
  let mockPrevQueryRef: { current: AggregateQuery | Query };
  let defaultArgs: Parameters<typeof createInitializeChartFunction>[0];

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetErrors = jest.fn();
    mockSetIsInitialized = jest.fn();
    mockRunQuery = jest.fn();
    mockPrevQueryRef = { current: { esql: '' } as AggregateQuery };

    defaultArgs = {
      isTextBasedLanguage: true,
      query: { esql: 'FROM my_data | limit 5' } as AggregateQuery,
      dataGridAttrs: undefined,
      isInitialized: false,
      currentAttributes: {
        state: { needsRefresh: false, query: { esql: '' } },
      } as TypedLensSerializedState['attributes'], // Minimal mock
      prevQueryRef: mockPrevQueryRef,
      setErrors: mockSetErrors,
      setIsInitialized: mockSetIsInitialized,
      runQuery: mockRunQuery,
    };
  });

  it('should call runQuery and set initialized to true if all conditions are met and not initialized', async () => {
    const initializeChart = createInitializeChartFunction(defaultArgs);
    await initializeChart(new AbortController());

    expect(mockRunQuery).toHaveBeenCalledTimes(1);
    expect(mockRunQuery).toHaveBeenCalledWith(
      defaultArgs.query,
      expect.any(AbortController),
      false // needsRefresh is false by default in defaultArgs
    );
    expect(mockPrevQueryRef.current).toEqual(defaultArgs.query);
    expect(mockSetIsInitialized).toHaveBeenCalledTimes(1);
    expect(mockSetIsInitialized).toHaveBeenCalledWith(true);
  });

  it('should NOT call mockRunQuery if already initialized', async () => {
    const args = { ...defaultArgs, isInitialized: true };
    const initializeChart = createInitializeChartFunction(args);
    await initializeChart(new AbortController());

    expect(mockRunQuery).not.toHaveBeenCalled();
    expect(mockSetIsInitialized).toHaveBeenCalledTimes(0);
  });

  it('should NOT call mockRunQuery if isTextBasedLanguage is false', async () => {
    const args = { ...defaultArgs, isTextBasedLanguage: false };
    const initializeChart = createInitializeChartFunction(args);
    await initializeChart(new AbortController());

    expect(mockRunQuery).not.toHaveBeenCalled();
    expect(mockSetIsInitialized).toHaveBeenCalledTimes(1);
    expect(mockSetIsInitialized).toHaveBeenCalledWith(true);
  });

  it('should NOT call mockRunQuery if query is not of AggregateQueryType', async () => {
    const args = { ...defaultArgs, query: { query: '', language: 'kuery' } }; // KQL query
    const initializeChart = createInitializeChartFunction(args);
    await initializeChart(new AbortController());

    expect(mockRunQuery).not.toHaveBeenCalled();
    expect(mockSetIsInitialized).toHaveBeenCalledTimes(1);
    expect(mockSetIsInitialized).toHaveBeenCalledWith(true);
  });

  it('should NOT call runQuery if dataGridAttrs is already defined', async () => {
    const args = {
      ...defaultArgs,
      dataGridAttrs: { columns: [], rows: [] },
    } as unknown as InitializeChartLogicArgs;
    const initializeChart = createInitializeChartFunction(args);
    await initializeChart(new AbortController());

    expect(mockRunQuery).not.toHaveBeenCalled();
    expect(mockSetIsInitialized).toHaveBeenCalledTimes(1);
    expect(mockSetIsInitialized).toHaveBeenCalledWith(true);
  });

  it('should set errors and update prevQueryRef if runQuery throws an error', async () => {
    const simulatedError = new Error('Failed to fetch data');
    (mockRunQuery as jest.Mock).mockRejectedValue(simulatedError);

    const initializeChart = createInitializeChartFunction(defaultArgs);
    await initializeChart(new AbortController());

    expect(mockRunQuery).toHaveBeenCalledTimes(1);
    expect(mockSetErrors).toHaveBeenCalledWith([simulatedError]);
    expect(mockPrevQueryRef.current).toEqual(defaultArgs.query);
    expect(mockSetIsInitialized).toHaveBeenCalledTimes(1);
    expect(mockSetIsInitialized).toHaveBeenCalledWith(true);
  });

  it('should pass needsRefresh to runQuery if currentAttributes.state.needsRefresh is true', async () => {
    const args = {
      ...defaultArgs,
      currentAttributes: {
        state: { needsRefresh: true, query: { esql: '' } },
      } as TypedLensSerializedState['attributes'],
    };
    const initializeChart = createInitializeChartFunction(args);
    await initializeChart(new AbortController());

    expect(mockRunQuery).toHaveBeenCalledTimes(1);
  });

  it('should set initialized to true even if runQuery is not called due to conditions', async () => {
    // Test a case where runQuery is not called
    const args = { ...defaultArgs, isTextBasedLanguage: false };
    const initializeChart = createInitializeChartFunction(args);
    await initializeChart(new AbortController());

    expect(mockRunQuery).not.toHaveBeenCalled();
    expect(mockSetIsInitialized).toHaveBeenCalledTimes(1);
    expect(mockSetIsInitialized).toHaveBeenCalledWith(true);
  });
});
