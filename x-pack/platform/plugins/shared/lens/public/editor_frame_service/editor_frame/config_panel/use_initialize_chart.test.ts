/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createInitializeChartFunction } from './use_initialize_chart';
import { AggregateQuery } from '@kbn/es-query';
import { getSuggestions } from './helpers'; // Mock this one!

jest.mock('./helpers', () => ({
  getSuggestions: jest.fn(),
}));

describe('createInitializeChartFunction', () => {
  let mockSetErrors: jest.Mock;
  let mockSetCurrentAttributes: jest.Mock;
  let mockUpdateSuggestion: jest.Mock;
  let mockPrevQueryRef: { current: AggregateQuery };
  let defaultArgs: Parameters<typeof createInitializeChartFunction>[0];

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetErrors = jest.fn();
    mockSetCurrentAttributes = jest.fn();
    mockUpdateSuggestion = jest.fn();
    mockPrevQueryRef = { current: { esql: '' } };

    defaultArgs = {
      isTextBasedLanguage: true,
      query: { esql: 'FROM my_data | limit 5' } as AggregateQuery,
      dataGridAttrs: undefined,
      currentErrors: [],
      attributes: { state: { needsRefresh: false } } as any,
      prevQueryRef: mockPrevQueryRef,
      setErrors: mockSetErrors,
      runQuery: jest.fn(),
    };
  });

  it('should call getSuggestions if all conditions are met (no errors)', async () => {
    (getSuggestions as jest.Mock).mockResolvedValue({});

    const initializeChart = createInitializeChartFunction(defaultArgs);
    await initializeChart(new AbortController());

    expect(getSuggestions).toHaveBeenCalledTimes(1);
    expect(mockSetErrors).toHaveBeenCalledWith([]); // Errors cleared on success
    expect(mockSetCurrentAttributes).toHaveBeenCalledTimes(1);
    expect(mockUpdateSuggestion).toHaveBeenCalledTimes(1);
    expect(mockPrevQueryRef.current).toEqual(defaultArgs.query);
  });

  it('should NOT call getSuggestions if isTextBasedLanguage is false', async () => {
    const args = { ...defaultArgs, isTextBasedLanguage: false };
    const initializeChart = createInitializeChartFunction(args);
    await initializeChart(new AbortController());

    expect(getSuggestions).not.toHaveBeenCalled();
  });

  it('should NOT call getSuggestions if query is not of AggregateQueryType', async () => {
    const args = { ...defaultArgs, query: { someOtherType: 'value' } as any }; // Simulate non-aggregate query
    const initializeChart = createInitializeChartFunction(args);
    await initializeChart(new AbortController());

    expect(getSuggestions).not.toHaveBeenCalled();
  });

  it('should NOT call getSuggestions if dataGridAttrs is defined', async () => {
    const args = { ...defaultArgs, dataGridAttrs: { columns: [], rows: [] } };
    const initializeChart = createInitializeChartFunction(args);
    await initializeChart(new AbortController());

    expect(getSuggestions).not.toHaveBeenCalled();
  });

  it('should NOT call getSuggestions if currentErrors array is NOT empty', async () => {
    const args = { ...defaultArgs, currentErrors: [new Error('Simulated error')] };
    const initializeChart = createInitializeChartFunction(args);
    await initializeChart(new AbortController());

    expect(getSuggestions).not.toHaveBeenCalled();
    // Ensure setErrors is not called again in this scenario if it's just checking the condition
    expect(mockSetErrors).not.toHaveBeenCalled();
  });

  it('should set errors and update prevQueryRef if getSuggestions throws an error', async () => {
    const simulatedError = new Error('Network error');
    (getSuggestions as jest.Mock).mockRejectedValue(simulatedError);

    const initializeChart = createInitializeChartFunction(defaultArgs);
    await initializeChart(new AbortController());

    expect(getSuggestions).toHaveBeenCalledTimes(1);
    expect(mockSetErrors).toHaveBeenCalledWith([simulatedError]);
    expect(mockSetCurrentAttributes).not.toHaveBeenCalled();
    expect(mockUpdateSuggestion).not.toHaveBeenCalled();
    expect(mockPrevQueryRef.current).toEqual(defaultArgs.query);
  });

  it('should pass needsRefresh boolean correctly to getSuggestions', async () => {
    (getSuggestions as jest.Mock).mockResolvedValue({});

    const argsWithRefresh = { ...defaultArgs, attributes: { state: { needsRefresh: true } } as any };
    const initializeChartWithRefresh = createInitializeChartFunction(argsWithRefresh);
    await initializeChartWithRefresh(new AbortController());

    expect(getSuggestions).toHaveBeenCalledWith(
      expect.any(Object), expect.any(Object), expect.any(Map), expect.any(Map),
      expect.any(Array), expect.any(Function), expect.any(AbortController),
      undefined, // setDataGridAttrs is undefined in createInitializeChartFunction for simplicity
      expect.any(Array), // esqlVariables
      true, // needsRefresh is true
      expect.any(Object) // currentAttributes
    );

    (getSuggestions as jest.Mock).mockClear(); // Clear for next test
    const argsWithoutRefresh = { ...defaultArgs, attributes: { state: { needsRefresh: false } } as any };
    const initializeChartWithoutRefresh = createInitializeChartFunction(argsWithoutRefresh);
    await initializeChartWithoutRefresh(new AbortController());

    expect(getSuggestions).toHaveBeenCalledWith(
      expect.any(Object), expect.any(Object), expect.any(Map), expect.any(Map),
      expect.any(Array), expect.any(Function), expect.any(AbortController),
      undefined,
      expect.any(Array),
      false, // needsRefresh is false
      expect.any(Object)
    );
  });
});