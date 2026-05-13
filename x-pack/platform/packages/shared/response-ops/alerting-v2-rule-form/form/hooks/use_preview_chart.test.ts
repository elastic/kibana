/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { createFormWrapper, createMockServices } from '../../test_utils';
import { usePreviewChart } from './use_preview_chart';

const mockGetESQLAdHocDataview = jest.fn();
jest.mock('@kbn/esql-utils', () => ({
  getESQLAdHocDataview: (...args: unknown[]) => mockGetESQLAdHocDataview(...args),
}));

jest.mock('@kbn/react-hooks', () => ({
  useDebouncedValue: <T>(value: T) => value,
}));

const mockGetLensAttributesFromSuggestion = jest.fn();

const mockLensAttributes = {
  visualizationType: 'lnsXY',
  title: '',
  state: {
    datasourceStates: { textBased: { layers: {} } },
    filters: [],
    query: { esql: 'FROM logs-*' },
    visualization: { layers: [] },
  },
  references: [],
};

jest.mock('@kbn/visualization-utils', () => {
  const actual = jest.requireActual('@kbn/visualization-utils');
  return {
    ...actual,
    getLensAttributesFromSuggestion: (...args: unknown[]) =>
      mockGetLensAttributesFromSuggestion(...args),
  };
});

const mockDataView = {
  id: 'test-id',
  timeFieldName: '@timestamp',
  getIndexPattern: () => 'logs-*',
  toSpec: () => ({ id: 'test-id', title: 'logs-*' }),
};

const defaultFormValues = {
  timeField: '@timestamp',
  schedule: { every: '5m', lookback: '5m' },
  evaluation: {
    query: {
      base: 'FROM logs-*',
    },
  },
};

const defaultParams = {
  query: 'FROM logs-*',
  timeField: '@timestamp',
  lookback: '5m',
};

// Fixed "now" so time-dependent assertions are deterministic
const MOCK_NOW = new Date('2026-03-11T12:00:00.000Z').getTime();

describe('usePreviewChart', () => {
  let mockSuggestions: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(MOCK_NOW);

    mockGetESQLAdHocDataview.mockResolvedValue(mockDataView);
    mockGetLensAttributesFromSuggestion.mockReturnValue(mockLensAttributes);

    // Get the suggestions mock from the lens plugin mock
    mockSuggestions = jest.fn().mockReturnValue([
      {
        title: 'Bar chart',
        score: 0.9,
        visualizationId: 'lnsXY',
        visualizationState: { layers: [] },
        datasourceState: { layers: {} },
        datasourceId: 'textBased',
        columns: 2,
        changeType: 'initial',
      },
    ]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('builds Lens attributes when all inputs are valid', async () => {
    const services = createMockServices();
    // Override stateHelperApi to use our controlled suggestions mock
    (services.lens.stateHelperApi as jest.Mock).mockResolvedValue({
      suggestions: mockSuggestions,
    });
    const wrapper = createFormWrapper(defaultFormValues, services);

    const { result } = renderHook(() => usePreviewChart(defaultParams), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.lensAttributes).toBeDefined();
    expect(result.current.hasError).toBe(false);
  });

  it('creates an ad-hoc DataView from the query', async () => {
    const services = createMockServices();
    (services.lens.stateHelperApi as jest.Mock).mockResolvedValue({
      suggestions: mockSuggestions,
    });
    const wrapper = createFormWrapper(defaultFormValues, services);

    renderHook(() => usePreviewChart(defaultParams), { wrapper });

    await waitFor(() => {
      expect(mockGetESQLAdHocDataview).toHaveBeenCalledWith(
        expect.objectContaining({
          dataViewsService: services.dataViews,
          query: 'FROM logs-*',
        })
      );
    });
  });

  it('calls lens.stateHelperApi().suggestions with the correct context, dataView, excludedVisualizations, and preferredChartType', async () => {
    const services = createMockServices();
    (services.lens.stateHelperApi as jest.Mock).mockResolvedValue({
      suggestions: mockSuggestions,
    });
    const wrapper = createFormWrapper(defaultFormValues, services);

    renderHook(() => usePreviewChart(defaultParams), { wrapper });

    await waitFor(() => {
      expect(mockSuggestions).toHaveBeenCalled();
    });

    const [context, dataView, excludedVisualizations, preferredChartType] =
      mockSuggestions.mock.calls[0];
    expect(context.query).toEqual({ esql: 'FROM logs-*' });
    expect(context.fieldName).toBe('');
    expect(context.dataViewSpec).toBeDefined();
    expect(dataView).toBe(mockDataView);
    // Datatable should be excluded so we get a chart, not a table
    expect(excludedVisualizations).toContain('lnsDatatable');
    // Should prefer bar chart type
    expect(preferredChartType).toBe('Bar');
  });

  it('passes esqlColumns as DatatableColumns to the suggestions context', async () => {
    const services = createMockServices();
    (services.lens.stateHelperApi as jest.Mock).mockResolvedValue({
      suggestions: mockSuggestions,
    });
    const wrapper = createFormWrapper(defaultFormValues, services);
    const esqlColumns = [
      { id: 'host.name', displayAsText: 'host.name', esType: 'keyword' },
      { id: 'count', displayAsText: 'count', esType: 'long' },
    ];

    renderHook(() => usePreviewChart({ ...defaultParams, esqlColumns }), { wrapper });

    await waitFor(() => {
      expect(mockSuggestions).toHaveBeenCalled();
    });

    const [context] = mockSuggestions.mock.calls[0];
    // ES types are mapped to Kibana DatatableColumnType:
    // 'keyword' → 'string', 'long' → 'number'
    expect(context.textBasedColumns).toEqual([
      { id: 'host.name', name: 'host.name', meta: { type: 'string', esType: 'keyword' } },
      { id: 'count', name: 'count', meta: { type: 'number', esType: 'long' } },
    ]);
  });

  it('returns undefined attributes when query is empty', async () => {
    const wrapper = createFormWrapper(defaultFormValues);

    const { result } = renderHook(() => usePreviewChart({ ...defaultParams, query: '' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.lensAttributes).toBeUndefined();
    expect(mockSuggestions).not.toHaveBeenCalled();
  });

  it('returns undefined attributes when query is only whitespace', async () => {
    const wrapper = createFormWrapper(defaultFormValues);

    const { result } = renderHook(() => usePreviewChart({ ...defaultParams, query: '   ' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.lensAttributes).toBeUndefined();
    expect(mockSuggestions).not.toHaveBeenCalled();
  });

  it('returns undefined attributes when timeField is empty', async () => {
    const wrapper = createFormWrapper(defaultFormValues);

    const { result } = renderHook(() => usePreviewChart({ ...defaultParams, timeField: '' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.lensAttributes).toBeUndefined();
    expect(mockSuggestions).not.toHaveBeenCalled();
  });

  it('returns undefined attributes when lookback is empty', async () => {
    const wrapper = createFormWrapper(defaultFormValues);

    const { result } = renderHook(() => usePreviewChart({ ...defaultParams, lookback: '' }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.lensAttributes).toBeUndefined();
    expect(mockSuggestions).not.toHaveBeenCalled();
  });

  it('does not build when enabled is false', async () => {
    const wrapper = createFormWrapper(defaultFormValues);

    const { result } = renderHook(() => usePreviewChart({ ...defaultParams, enabled: false }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.lensAttributes).toBeUndefined();
    expect(mockSuggestions).not.toHaveBeenCalled();
  });

  it('sets hasError when DataView creation fails', async () => {
    mockGetESQLAdHocDataview.mockRejectedValue(new Error('DataView creation failed'));

    const services = createMockServices();
    (services.lens.stateHelperApi as jest.Mock).mockResolvedValue({
      suggestions: mockSuggestions,
    });
    const wrapper = createFormWrapper(defaultFormValues, services);

    const { result } = renderHook(() => usePreviewChart(defaultParams), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasError).toBe(true);
    expect(result.current.lensAttributes).toBeUndefined();
  });

  it('handles no suggestions gracefully (returns undefined lensAttributes)', async () => {
    const services = createMockServices();
    (services.lens.stateHelperApi as jest.Mock).mockResolvedValue({
      suggestions: jest.fn().mockReturnValue([]),
    });
    const wrapper = createFormWrapper(defaultFormValues, services);

    const { result } = renderHook(() => usePreviewChart(defaultParams), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.lensAttributes).toBeUndefined();
    expect(result.current.hasError).toBe(false);
  });

  it('filters out table suggestions even if they slip through', async () => {
    const services = createMockServices();
    const mockSuggestionsWithTable = jest.fn().mockReturnValue([
      {
        title: 'Table',
        score: 0.9,
        visualizationId: 'lnsDatatable',
        visualizationState: {},
        datasourceState: { layers: {} },
        datasourceId: 'textBased',
        columns: 2,
        changeType: 'initial',
      },
      {
        title: 'Bar chart',
        score: 0.8,
        visualizationId: 'lnsXY',
        visualizationState: { layers: [] },
        datasourceState: { layers: {} },
        datasourceId: 'textBased',
        columns: 2,
        changeType: 'initial',
      },
    ]);
    (services.lens.stateHelperApi as jest.Mock).mockResolvedValue({
      suggestions: mockSuggestionsWithTable,
    });
    const wrapper = createFormWrapper(defaultFormValues, services);

    const { result } = renderHook(() => usePreviewChart(defaultParams), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should use the bar chart, not the table
    expect(result.current.lensAttributes).toBeDefined();
    expect(result.current.lensAttributes?.visualizationType).toBe('lnsXY');
    expect(result.current.hasError).toBe(false);
  });

  it('returns undefined when only table suggestions are available', async () => {
    const services = createMockServices();
    const mockSuggestionsOnlyTable = jest.fn().mockReturnValue([
      {
        title: 'Table',
        score: 0.9,
        visualizationId: 'lnsDatatable',
        visualizationState: {},
        datasourceState: { layers: {} },
        datasourceId: 'textBased',
        columns: 2,
        changeType: 'initial',
      },
    ]);
    (services.lens.stateHelperApi as jest.Mock).mockResolvedValue({
      suggestions: mockSuggestionsOnlyTable,
    });
    const wrapper = createFormWrapper(defaultFormValues, services);

    const { result } = renderHook(() => usePreviewChart(defaultParams), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should return undefined since we can't make a chart suggestion
    expect(result.current.lensAttributes).toBeUndefined();
    expect(result.current.hasError).toBe(false);
  });

  it('returns undefined when suggestion has no visualizationId', async () => {
    const services = createMockServices();
    const mockSuggestionsInvalid = jest.fn().mockReturnValue([
      {
        title: 'Invalid suggestion',
        score: 0.9,
        // Missing visualizationId
        visualizationState: {},
        datasourceState: { layers: {} },
        datasourceId: 'textBased',
        columns: 2,
        changeType: 'initial',
      },
    ]);
    (services.lens.stateHelperApi as jest.Mock).mockResolvedValue({
      suggestions: mockSuggestionsInvalid,
    });
    const wrapper = createFormWrapper(defaultFormValues, services);

    const { result } = renderHook(() => usePreviewChart(defaultParams), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should return undefined since suggestion is invalid
    expect(result.current.lensAttributes).toBeUndefined();
    expect(result.current.hasError).toBe(false);
  });

  it('returns undefined attributes for syntactically invalid ES|QL', async () => {
    const services = createMockServices();
    (services.lens.stateHelperApi as jest.Mock).mockResolvedValue({
      suggestions: mockSuggestions,
    });
    const wrapper = createFormWrapper(defaultFormValues, services);

    const { result } = renderHook(
      () => usePreviewChart({ ...defaultParams, query: 'NOT VALID ESQL |||' }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.lensAttributes).toBeUndefined();
    expect(mockSuggestions).not.toHaveBeenCalled();
  });

  describe('time range', () => {
    it('computes a time range from a valid lookback window', async () => {
      const wrapper = createFormWrapper(defaultFormValues);

      const { result } = renderHook(() => usePreviewChart({ ...defaultParams, lookback: '1h' }), {
        wrapper,
      });

      expect(result.current.timeRange).toBeDefined();
      expect(result.current.timeRange?.from).toBeDefined();
      expect(result.current.timeRange?.to).toBeDefined();

      // The time range should span roughly 1 hour
      const fromDate = new Date(result.current.timeRange!.from).getTime();
      const toDate = new Date(result.current.timeRange!.to).getTime();
      const diffMs = toDate - fromDate;
      expect(diffMs).toBeGreaterThanOrEqual(59 * 60 * 1000);
      expect(diffMs).toBeLessThanOrEqual(61 * 60 * 1000);
    });

    it('returns undefined timeRange when lookback is empty', async () => {
      const wrapper = createFormWrapper(defaultFormValues);

      const { result } = renderHook(() => usePreviewChart({ ...defaultParams, lookback: '' }), {
        wrapper,
      });

      expect(result.current.timeRange).toBeUndefined();
    });

    it('returns undefined timeRange when lookback is invalid', async () => {
      const wrapper = createFormWrapper(defaultFormValues);

      const { result } = renderHook(
        () => usePreviewChart({ ...defaultParams, lookback: 'invalid' }),
        { wrapper }
      );

      expect(result.current.timeRange).toBeUndefined();
    });
  });
});
