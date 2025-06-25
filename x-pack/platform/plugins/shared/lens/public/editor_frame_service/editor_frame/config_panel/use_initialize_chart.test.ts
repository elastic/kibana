/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AggregateQuery, Query } from '@kbn/es-query';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { getSuggestions } from '../../../app_plugin/shared/edit_on_the_fly/helpers'; // Mock this one!
import {
  createInitializeChartFunction,
  type InitializeChartLogicArgs,
} from './use_initialize_chart';
import { TypedLensSerializedState } from '../../../react_embeddable/types';
import { mockVisualizationMap, mockDatasourceMap } from '../../../mocks';

jest.mock('../../../app_plugin/shared/edit_on_the_fly/helpers', () => ({
  getSuggestions: jest.fn(),
}));

describe('createInitializeChartFunction', () => {
  const dataMock = dataPluginMock.createStartContract();
  let mockSetErrors: jest.Mock;
  let mockSetIsInitialized: jest.Mock;
  let mockSetDataGridAttrs: jest.Mock;
  let mockSuccessCallback: jest.Mock;
  let mockPrevQueryRef: { current: AggregateQuery | Query };
  let defaultArgs: Parameters<typeof createInitializeChartFunction>[0];

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetErrors = jest.fn();
    mockSetIsInitialized = jest.fn();
    mockSetDataGridAttrs = jest.fn();
    mockSuccessCallback = jest.fn();
    mockPrevQueryRef = { current: { esql: '' } as AggregateQuery };

    defaultArgs = {
      isTextBasedLanguage: true,
      query: { esql: 'FROM my_data | limit 5' } as AggregateQuery,
      dataGridAttrs: undefined,
      isInitialized: false,
      data: dataMock,
      datasourceMap: mockDatasourceMap(),
      visualizationMap: mockVisualizationMap(),
      adHocDataViews: [],
      currentAttributes: {
        state: { needsRefresh: false, query: { esql: '' } },
      } as TypedLensSerializedState['attributes'], // Minimal mock
      successCallback: mockSuccessCallback,
      prevQueryRef: mockPrevQueryRef,
      setErrors: mockSetErrors,
      setIsInitialized: mockSetIsInitialized,
      setDataGridAttrs: mockSetDataGridAttrs,
      esqlVariables: [],
    };
  });

  it('should call getSuggestions and set initialized to true if all conditions are met and not initialized', async () => {
    (getSuggestions as jest.Mock).mockResolvedValue({ some: 'attrs' });

    const initializeChart = createInitializeChartFunction(defaultArgs);
    await initializeChart(new AbortController());

    expect(getSuggestions).toHaveBeenCalledTimes(1);
    expect(getSuggestions).toHaveBeenCalledWith(
      defaultArgs.query,
      defaultArgs.data,
      defaultArgs.datasourceMap,
      defaultArgs.visualizationMap,
      defaultArgs.adHocDataViews,
      mockSetErrors,
      expect.any(AbortController),
      mockSetDataGridAttrs,
      defaultArgs.esqlVariables,
      false, // needsRefresh is false by default in defaultArgs
      defaultArgs.currentAttributes
    );
    expect(mockSuccessCallback).toHaveBeenCalledTimes(1);
    expect(mockSuccessCallback).toHaveBeenCalledWith({ some: 'attrs' });
    expect(mockSetErrors).toHaveBeenCalledWith([]); // Errors cleared on success
    expect(mockPrevQueryRef.current).toEqual(defaultArgs.query);
    expect(mockSetIsInitialized).toHaveBeenCalledTimes(1);
    expect(mockSetIsInitialized).toHaveBeenCalledWith(true);
  });

  it('should NOT call getSuggestions if already initialized', async () => {
    const args = { ...defaultArgs, isInitialized: true };
    const initializeChart = createInitializeChartFunction(args);
    await initializeChart(new AbortController());

    expect(getSuggestions).not.toHaveBeenCalled();
    expect(mockSetIsInitialized).toHaveBeenCalledTimes(0);
  });

  it('should NOT call getSuggestions if isTextBasedLanguage is false', async () => {
    const args = { ...defaultArgs, isTextBasedLanguage: false };
    const initializeChart = createInitializeChartFunction(args);
    await initializeChart(new AbortController());

    expect(getSuggestions).not.toHaveBeenCalled();
    expect(mockSetIsInitialized).toHaveBeenCalledTimes(1);
    expect(mockSetIsInitialized).toHaveBeenCalledWith(true);
  });

  it('should NOT call getSuggestions if query is not of AggregateQueryType', async () => {
    const args = { ...defaultArgs, query: { query: '', language: 'kuery' } }; // KQL query
    const initializeChart = createInitializeChartFunction(args);
    await initializeChart(new AbortController());

    expect(getSuggestions).not.toHaveBeenCalled();
    expect(mockSetIsInitialized).toHaveBeenCalledTimes(1);
    expect(mockSetIsInitialized).toHaveBeenCalledWith(true);
  });

  it('should NOT call getSuggestions if dataGridAttrs is already defined', async () => {
    const args = {
      ...defaultArgs,
      dataGridAttrs: { columns: [], rows: [] },
    } as unknown as InitializeChartLogicArgs;
    const initializeChart = createInitializeChartFunction(args);
    await initializeChart(new AbortController());

    expect(getSuggestions).not.toHaveBeenCalled();
    expect(mockSetIsInitialized).toHaveBeenCalledTimes(1);
    expect(mockSetIsInitialized).toHaveBeenCalledWith(true);
  });

  it('should set errors and update prevQueryRef if getSuggestions throws an error', async () => {
    const simulatedError = new Error('Failed to fetch data');
    (getSuggestions as jest.Mock).mockRejectedValue(simulatedError);

    const initializeChart = createInitializeChartFunction(defaultArgs);
    await initializeChart(new AbortController());

    expect(getSuggestions).toHaveBeenCalledTimes(1);
    expect(mockSetErrors).toHaveBeenCalledWith([simulatedError]);
    expect(mockSuccessCallback).not.toHaveBeenCalled(); // Success callback should not be called
    expect(mockPrevQueryRef.current).toEqual(defaultArgs.query);
    expect(mockSetIsInitialized).toHaveBeenCalledTimes(1);
    expect(mockSetIsInitialized).toHaveBeenCalledWith(true);
  });

  it('should pass needsRefresh to getSuggestions if currentAttributes.state.needsRefresh is true', async () => {
    (getSuggestions as jest.Mock).mockResolvedValue({});
    const args = {
      ...defaultArgs,
      currentAttributes: {
        state: { needsRefresh: true, query: { esql: '' } },
      } as TypedLensSerializedState['attributes'],
    };
    const initializeChart = createInitializeChartFunction(args);
    await initializeChart(new AbortController());

    expect(getSuggestions).toHaveBeenCalledTimes(1);
  });

  it('should set initialized to true even if getSuggestions is not called due to conditions', async () => {
    // Test a case where getSuggestions is not called
    const args = { ...defaultArgs, isTextBasedLanguage: false };
    const initializeChart = createInitializeChartFunction(args);
    await initializeChart(new AbortController());

    expect(getSuggestions).not.toHaveBeenCalled();
    expect(mockSetIsInitialized).toHaveBeenCalledTimes(1);
    expect(mockSetIsInitialized).toHaveBeenCalledWith(true);
  });
});
