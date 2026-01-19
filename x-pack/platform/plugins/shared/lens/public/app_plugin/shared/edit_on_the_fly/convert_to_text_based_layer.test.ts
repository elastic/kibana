/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FormBasedPrivateState,
  TypedLensSerializedState,
  DatasourceStates,
  IndexPattern,
} from '@kbn/lens-common';
import { createMockFramePublicAPI } from '../../../mocks';
import { convertFormBasedToTextBasedLayer } from './convert_to_text_based_layer';
import type { ConvertibleLayer } from './convert_to_esql_modal';

describe('convertFormBasedToTextBasedLayer', () => {
  const layerId = 'layer1';

  const mockIndexPattern: IndexPattern = {
    id: 'test-index-pattern',
    title: 'test-index',
    name: 'test-index',
    timeFieldName: '@timestamp',
    fields: [
      { name: '@timestamp', type: 'date', aggregatable: true, searchable: true },
      { name: 'bytes', type: 'number', aggregatable: true, searchable: true },
    ],
    getFieldByName: (name: string) => {
      const fields: Record<string, { name: string; type: string }> = {
        '@timestamp': { name: '@timestamp', type: 'date' },
        bytes: { name: 'bytes', type: 'number' },
      };
      return fields[name];
    },
    getFormatterForField: () => ({ id: 'number', params: {} }),
    hasRestrictions: false,
  } as unknown as IndexPattern;

  const mockFormBasedLayer = {
    indexPatternId: 'test-index-pattern',
    columnOrder: ['col1', 'col2'],
    columns: {
      col1: {
        operationType: 'date_histogram',
        sourceField: '@timestamp',
        label: '@timestamp',
        dataType: 'date',
        isBucketed: true,
        scale: 'interval',
        params: { interval: 'auto' },
      },
      col2: {
        operationType: 'count',
        sourceField: '___records___',
        label: 'Count of records',
        dataType: 'number',
        isBucketed: false,
        scale: 'ratio',
      },
    },
  };

  const mockFormBasedState: FormBasedPrivateState = {
    layers: {
      [layerId]: mockFormBasedLayer,
    },
    currentIndexPatternId: 'test-index-pattern',
  } as unknown as FormBasedPrivateState;

  const mockDatasourceStates: DatasourceStates = {
    formBased: {
      state: mockFormBasedState,
      isLoading: false,
    },
  };

  const mockVisualizationState = {
    layers: [
      {
        layerId,
        layerType: 'data',
        xAccessor: 'col1',
        accessors: ['col2'],
      },
    ],
  };

  const mockAttributes: TypedLensSerializedState['attributes'] = {
    title: 'Test',
    visualizationType: 'lnsXY',
    state: {
      query: { query: '', language: 'kuery' },
      filters: [],
      datasourceStates: {
        formBased: mockFormBasedState,
      },
      visualization: mockVisualizationState,
    },
    references: [],
  } as unknown as TypedLensSerializedState['attributes'];

  // Pre-computed conversion data that would normally come from useEsqlConversionCheck
  const mockConvertibleLayers: ConvertibleLayer[] = [
    {
      id: layerId,
      icon: 'layers',
      name: '',
      type: 'data',
      query: `FROM test-index
        | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend
        | STATS bucket_0_0 = COUNT(*) BY @timestamp = BUCKET(@timestamp, 30 minutes)
        | SORT @timestamp ASC`,
      isConvertibleToEsql: true,
      conversionData: {
        esAggsIdMap: {
          bucket_0_0: [
            {
              id: 'col2',
              label: 'Count of records',
              operationType: 'count',
              sourceField: '___records___',
              dataType: 'number',
              interval: undefined as never,
            },
          ],
          '@timestamp': [
            {
              id: 'col1',
              label: '@timestamp',
              operationType: 'date_histogram',
              sourceField: '@timestamp',
              dataType: 'date',
              interval: 1800000, // 30 minutes in ms
            },
          ],
        },
        partialRows: false,
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns undefined when layersToConvert is empty', () => {
    const framePublicAPI = createMockFramePublicAPI({
      dataViews: {
        indexPatterns: { 'test-index-pattern': mockIndexPattern },
        indexPatternRefs: [{ id: 'test-index-pattern', title: 'test-index', name: 'test-index' }],
      },
    });

    const result = convertFormBasedToTextBasedLayer({
      layersToConvert: [],
      attributes: mockAttributes,
      visualizationState: mockVisualizationState,
      datasourceStates: mockDatasourceStates,
      framePublicAPI,
    });

    expect(result).toBeUndefined();
  });

  it('returns undefined when formBased state is missing', () => {
    const framePublicAPI = createMockFramePublicAPI({
      dataViews: {
        indexPatterns: { 'test-index-pattern': mockIndexPattern },
        indexPatternRefs: [{ id: 'test-index-pattern', title: 'test-index', name: 'test-index' }],
      },
    });

    const result = convertFormBasedToTextBasedLayer({
      layersToConvert: mockConvertibleLayers,
      attributes: mockAttributes,
      visualizationState: mockVisualizationState,
      datasourceStates: {},
      framePublicAPI,
    });

    expect(result).toBeUndefined();
  });

  it('returns undefined when layer ID does not exist in formBased state', () => {
    const framePublicAPI = createMockFramePublicAPI({
      dataViews: {
        indexPatterns: { 'test-index-pattern': mockIndexPattern },
        indexPatternRefs: [{ id: 'test-index-pattern', title: 'test-index', name: 'test-index' }],
      },
    });

    const nonExistentLayer: ConvertibleLayer = {
      id: 'non-existent-layer',
      icon: 'layers',
      name: '',
      type: 'data',
      query: 'FROM test-index | STATS count = COUNT(*)',
      isConvertibleToEsql: true,
      conversionData: {
        esAggsIdMap: {},
        partialRows: false,
      },
    };

    const result = convertFormBasedToTextBasedLayer({
      layersToConvert: [nonExistentLayer],
      attributes: mockAttributes,
      visualizationState: mockVisualizationState,
      datasourceStates: mockDatasourceStates,
      framePublicAPI,
    });

    // Returns undefined because the layer doesn't exist in formBased state
    expect(result).toBeUndefined();
  });

  it('converts a form-based layer to text-based successfully using pre-computed data', () => {
    const framePublicAPI = createMockFramePublicAPI({
      dataViews: {
        indexPatterns: { 'test-index-pattern': mockIndexPattern },
        indexPatternRefs: [{ id: 'test-index-pattern', title: 'test-index', name: 'test-index' }],
      },
      dateRange: {
        fromDate: '2024-01-01T00:00:00.000Z',
        toDate: '2024-01-02T00:00:00.000Z',
      },
    });

    const result = convertFormBasedToTextBasedLayer({
      layersToConvert: mockConvertibleLayers,
      attributes: mockAttributes,
      visualizationState: mockVisualizationState,
      datasourceStates: mockDatasourceStates,
      framePublicAPI,
    });

    expect(result).toMatchInlineSnapshot(`
      Object {
        "references": Array [],
        "state": Object {
          "datasourceStates": Object {
            "textBased": Object {
              "indexPatternRefs": Array [
                Object {
                  "id": "test-index-pattern",
                  "name": "test-index",
                  "title": "test-index",
                },
              ],
              "layers": Object {
                "layer1": Object {
                  "columns": Array [
                    Object {
                      "columnId": "col2",
                      "fieldName": "bucket_0_0",
                      "label": "Count of records",
                      "meta": Object {
                        "type": "number",
                      },
                    },
                    Object {
                      "columnId": "col1",
                      "fieldName": "@timestamp",
                      "label": "@timestamp",
                      "meta": Object {
                        "type": "date",
                      },
                    },
                  ],
                  "index": "test-index-pattern",
                  "query": Object {
                    "esql": "FROM test-index
              | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend
              | STATS bucket_0_0 = COUNT(*) BY @timestamp = BUCKET(@timestamp, 30 minutes)
              | SORT @timestamp ASC",
                  },
                  "timeField": "@timestamp",
                },
              },
            },
          },
          "filters": Array [],
          "query": Object {
            "esql": "FROM test-index
              | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend
              | STATS bucket_0_0 = COUNT(*) BY @timestamp = BUCKET(@timestamp, 30 minutes)
              | SORT @timestamp ASC",
          },
          "visualization": Object {
            "layers": Array [
              Object {
                "accessors": Array [
                  "col2",
                ],
                "layerId": "layer1",
                "layerType": "data",
                "xAccessor": "col1",
              },
            ],
          },
        },
        "title": "Test",
        "visualizationType": "lnsXY",
      }
    `);
  });

  it('preserves original column IDs in visualization state', () => {
    const framePublicAPI = createMockFramePublicAPI({
      dataViews: {
        indexPatterns: { 'test-index-pattern': mockIndexPattern },
        indexPatternRefs: [{ id: 'test-index-pattern', title: 'test-index', name: 'test-index' }],
      },
      dateRange: {
        fromDate: '2024-01-01T00:00:00.000Z',
        toDate: '2024-01-02T00:00:00.000Z',
      },
    });

    const result = convertFormBasedToTextBasedLayer({
      layersToConvert: mockConvertibleLayers,
      attributes: mockAttributes,
      visualizationState: mockVisualizationState,
      datasourceStates: mockDatasourceStates,
      framePublicAPI,
    });

    // Visualization state should be passed through unchanged - original column IDs preserved
    expect(result?.state.visualization).toMatchInlineSnapshot(`
      Object {
        "layers": Array [
          Object {
            "accessors": Array [
              "col2",
            ],
            "layerId": "layer1",
            "layerType": "data",
            "xAccessor": "col1",
          },
        ],
      }
    `);

    // Text-based layer columns should use original column IDs with fieldName holding ES|QL field name
    const textBasedState = result?.state.datasourceStates.textBased;
    const columns = textBasedState?.layers[layerId]?.columns;
    expect(columns).toEqual([
      {
        columnId: 'col2',
        fieldName: 'bucket_0_0',
        label: 'Count of records',
        meta: { type: 'number' },
      },
      {
        columnId: 'col1',
        fieldName: '@timestamp',
        label: '@timestamp',
        meta: { type: 'date' },
      },
    ]);
  });

  it('uses custom pre-computed conversion data with different column mappings', () => {
    const framePublicAPI = createMockFramePublicAPI({
      dataViews: {
        indexPatterns: { 'test-index-pattern': mockIndexPattern },
        indexPatternRefs: [{ id: 'test-index-pattern', title: 'test-index', name: 'test-index' }],
      },
      dateRange: {
        fromDate: '2024-01-01T00:00:00.000Z',
        toDate: '2024-01-02T00:00:00.000Z',
      },
    });

    // Pre-computed conversion data with custom ES|QL query and column mappings
    const preComputedEsql =
      'FROM test-index | STATS custom_count = COUNT(*) BY custom_timestamp = BUCKET(@timestamp, 1 hour)';
    const customConvertibleLayers: ConvertibleLayer[] = [
      {
        id: layerId,
        icon: 'layers',
        name: '',
        type: 'data',
        query: preComputedEsql,
        isConvertibleToEsql: true,
        conversionData: {
          esAggsIdMap: {
            custom_count: [
              {
                id: 'col2',
                label: 'Count of records',
                operationType: 'count',
                sourceField: '___records___',
                dataType: 'number',
                interval: undefined as never,
              },
            ],
            custom_timestamp: [
              {
                id: 'col1',
                label: '@timestamp',
                operationType: 'date_histogram',
                sourceField: '@timestamp',
                dataType: 'date',
                interval: 3600000, // 1 hour in ms
              },
            ],
          },
          partialRows: true,
        },
      },
    ];

    const result = convertFormBasedToTextBasedLayer({
      layersToConvert: customConvertibleLayers,
      attributes: mockAttributes,
      visualizationState: mockVisualizationState,
      datasourceStates: mockDatasourceStates,
      framePublicAPI,
    });

    // Should use the pre-computed ES|QL query
    expect(result?.state.query).toEqual({ esql: preComputedEsql });

    // Visualization state should be passed through unchanged - original column IDs preserved
    expect(result?.state.visualization).toMatchInlineSnapshot(`
      Object {
        "layers": Array [
          Object {
            "accessors": Array [
              "col2",
            ],
            "layerId": "layer1",
            "layerType": "data",
            "xAccessor": "col1",
          },
        ],
      }
    `);

    // Verify the text-based layer uses the pre-computed query and preserves original column IDs
    const textBasedState = result?.state.datasourceStates.textBased;
    expect(textBasedState?.layers[layerId]?.query).toEqual({ esql: preComputedEsql });

    // Columns should have original IDs with fieldName holding ES|QL field names
    const columns = textBasedState?.layers[layerId]?.columns;
    expect(columns).toEqual([
      {
        columnId: 'col2',
        fieldName: 'custom_count',
        label: 'Count of records',
        meta: { type: 'number' },
      },
      {
        columnId: 'col1',
        fieldName: 'custom_timestamp',
        label: '@timestamp',
        meta: { type: 'date' },
      },
    ]);
  });

  it('works with visualization states without layers array (e.g., Metric, Datatable)', () => {
    const framePublicAPI = createMockFramePublicAPI({
      dataViews: {
        indexPatterns: { 'test-index-pattern': mockIndexPattern },
        indexPatternRefs: [{ id: 'test-index-pattern', title: 'test-index', name: 'test-index' }],
      },
      dateRange: {
        fromDate: '2024-01-01T00:00:00.000Z',
        toDate: '2024-01-02T00:00:00.000Z',
      },
    });

    // Metric visualization state (no layers array)
    const metricVisualizationState = {
      layerId,
      layerType: 'data',
      accessor: 'col2',
    };

    const result = convertFormBasedToTextBasedLayer({
      layersToConvert: mockConvertibleLayers,
      attributes: mockAttributes,
      visualizationState: metricVisualizationState,
      datasourceStates: mockDatasourceStates,
      framePublicAPI,
    });

    // Should succeed and pass through visualization state unchanged
    expect(result).toBeDefined();
    expect(result?.state.visualization).toEqual(metricVisualizationState);

    // Text-based layer should have original column IDs
    const textBasedState = result?.state.datasourceStates.textBased;
    const columns = textBasedState?.layers[layerId]?.columns;
    expect(columns?.map((c) => c.columnId)).toEqual(['col2', 'col1']);
  });

  it('preserves custom labels from esAggsIdMap', () => {
    const framePublicAPI = createMockFramePublicAPI({
      dataViews: {
        indexPatterns: { 'test-index-pattern': mockIndexPattern },
        indexPatternRefs: [{ id: 'test-index-pattern', title: 'test-index', name: 'test-index' }],
      },
      dateRange: {
        fromDate: '2024-01-01T00:00:00.000Z',
        toDate: '2024-01-02T00:00:00.000Z',
      },
    });

    const layersWithCustomLabels: ConvertibleLayer[] = [
      {
        id: layerId,
        icon: 'layers',
        name: '',
        type: 'data',
        query: 'FROM test-index | STATS my_count = COUNT(*)',
        isConvertibleToEsql: true,
        conversionData: {
          esAggsIdMap: {
            my_count: [
              {
                id: 'col2',
                label: 'My Custom Label',
                customLabel: true,
                operationType: 'count',
                sourceField: '___records___',
                dataType: 'number',
                interval: undefined as never,
              },
            ],
          },
          partialRows: false,
        },
      },
    ];

    const result = convertFormBasedToTextBasedLayer({
      layersToConvert: layersWithCustomLabels,
      attributes: mockAttributes,
      visualizationState: mockVisualizationState,
      datasourceStates: mockDatasourceStates,
      framePublicAPI,
    });

    const textBasedState = result?.state.datasourceStates.textBased;
    const columns = textBasedState?.layers[layerId]?.columns;

    expect(columns).toEqual([
      {
        columnId: 'col2',
        fieldName: 'my_count',
        label: 'My Custom Label',
        customLabel: true,
        meta: { type: 'number' },
      },
    ]);
  });

  it('preserves format configuration from esAggsIdMap', () => {
    const framePublicAPI = createMockFramePublicAPI({
      dataViews: {
        indexPatterns: { 'test-index-pattern': mockIndexPattern },
        indexPatternRefs: [{ id: 'test-index-pattern', title: 'test-index', name: 'test-index' }],
      },
      dateRange: {
        fromDate: '2024-01-01T00:00:00.000Z',
        toDate: '2024-01-02T00:00:00.000Z',
      },
    });

    const layersWithFormat: ConvertibleLayer[] = [
      {
        id: layerId,
        icon: 'layers',
        name: '',
        type: 'data',
        query: 'FROM test-index | STATS total_bytes = SUM(bytes)',
        isConvertibleToEsql: true,
        conversionData: {
          esAggsIdMap: {
            total_bytes: [
              {
                id: 'col2',
                label: 'Total Bytes',
                operationType: 'sum',
                sourceField: 'bytes',
                dataType: 'number',
                format: { id: 'bytes', params: { decimals: 2 } },
                interval: undefined as never,
              },
            ],
          },
          partialRows: false,
        },
      },
    ];

    const result = convertFormBasedToTextBasedLayer({
      layersToConvert: layersWithFormat,
      attributes: mockAttributes,
      visualizationState: mockVisualizationState,
      datasourceStates: mockDatasourceStates,
      framePublicAPI,
    });

    const textBasedState = result?.state.datasourceStates.textBased;
    const columns = textBasedState?.layers[layerId]?.columns;

    expect(columns).toEqual([
      {
        columnId: 'col2',
        fieldName: 'total_bytes',
        label: 'Total Bytes',
        params: { format: { id: 'bytes', params: { decimals: 2 } } },
        meta: { type: 'number' },
      },
    ]);
  });

  it('preserves both custom label and format together', () => {
    const framePublicAPI = createMockFramePublicAPI({
      dataViews: {
        indexPatterns: { 'test-index-pattern': mockIndexPattern },
        indexPatternRefs: [{ id: 'test-index-pattern', title: 'test-index', name: 'test-index' }],
      },
      dateRange: {
        fromDate: '2024-01-01T00:00:00.000Z',
        toDate: '2024-01-02T00:00:00.000Z',
      },
    });

    const layersWithLabelAndFormat: ConvertibleLayer[] = [
      {
        id: layerId,
        icon: 'layers',
        name: '',
        type: 'data',
        query: 'FROM test-index | STATS total_bytes = SUM(bytes)',
        isConvertibleToEsql: true,
        conversionData: {
          esAggsIdMap: {
            total_bytes: [
              {
                id: 'col2',
                label: 'Network Traffic (GB)',
                customLabel: true,
                operationType: 'sum',
                sourceField: 'bytes',
                dataType: 'number',
                format: { id: 'bytes', params: { decimals: 1 } },
                interval: undefined as never,
              },
            ],
          },
          partialRows: false,
        },
      },
    ];

    const result = convertFormBasedToTextBasedLayer({
      layersToConvert: layersWithLabelAndFormat,
      attributes: mockAttributes,
      visualizationState: mockVisualizationState,
      datasourceStates: mockDatasourceStates,
      framePublicAPI,
    });

    const textBasedState = result?.state.datasourceStates.textBased;
    const columns = textBasedState?.layers[layerId]?.columns;

    expect(columns).toEqual([
      {
        columnId: 'col2',
        fieldName: 'total_bytes',
        label: 'Network Traffic (GB)',
        customLabel: true,
        params: { format: { id: 'bytes', params: { decimals: 1 } } },
        meta: { type: 'number' },
      },
    ]);
  });

  it('does not include params when format is not defined', () => {
    const framePublicAPI = createMockFramePublicAPI({
      dataViews: {
        indexPatterns: { 'test-index-pattern': mockIndexPattern },
        indexPatternRefs: [{ id: 'test-index-pattern', title: 'test-index', name: 'test-index' }],
      },
      dateRange: {
        fromDate: '2024-01-01T00:00:00.000Z',
        toDate: '2024-01-02T00:00:00.000Z',
      },
    });

    const layersWithoutFormat: ConvertibleLayer[] = [
      {
        id: layerId,
        icon: 'layers',
        name: '',
        type: 'data',
        query: 'FROM test-index | STATS my_count = COUNT(*)',
        isConvertibleToEsql: true,
        conversionData: {
          esAggsIdMap: {
            my_count: [
              {
                id: 'col2',
                label: 'Count',
                operationType: 'count',
                sourceField: '___records___',
                dataType: 'number',
                // No format defined
                interval: undefined as never,
              },
            ],
          },
          partialRows: false,
        },
      },
    ];

    const result = convertFormBasedToTextBasedLayer({
      layersToConvert: layersWithoutFormat,
      attributes: mockAttributes,
      visualizationState: mockVisualizationState,
      datasourceStates: mockDatasourceStates,
      framePublicAPI,
    });

    const textBasedState = result?.state.datasourceStates.textBased;
    const columns = textBasedState?.layers[layerId]?.columns;

    // params should not be present when format is undefined
    expect(columns).toEqual([
      {
        columnId: 'col2',
        fieldName: 'my_count',
        label: 'Count',
        meta: { type: 'number' },
      },
    ]);
    expect(columns?.[0]).not.toHaveProperty('params');
    expect(columns?.[0]).not.toHaveProperty('customLabel');
  });

  it('preserves data view field format from fieldFormatMap when column has no format', () => {
    // Create an index pattern with fieldFormatMap containing a currency format
    const indexPatternWithFieldFormat: IndexPattern = {
      ...mockIndexPattern,
      fieldFormatMap: {
        bytes: { id: 'currency', params: { pattern: '$0,0.00' } },
      },
    } as unknown as IndexPattern;

    const framePublicAPI = createMockFramePublicAPI({
      dataViews: {
        indexPatterns: { 'test-index-pattern': indexPatternWithFieldFormat },
        indexPatternRefs: [{ id: 'test-index-pattern', title: 'test-index', name: 'test-index' }],
      },
      dateRange: {
        fromDate: '2024-01-01T00:00:00.000Z',
        toDate: '2024-01-02T00:00:00.000Z',
      },
    });

    // Column that uses the 'bytes' field but has no format configured
    const layersWithFieldFormatFromDataView: ConvertibleLayer[] = [
      {
        id: layerId,
        icon: 'layers',
        name: '',
        type: 'data',
        query: 'FROM test-index | STATS total_bytes = SUM(bytes)',
        isConvertibleToEsql: true,
        conversionData: {
          esAggsIdMap: {
            total_bytes: [
              {
                id: 'col2',
                label: 'Total Bytes',
                operationType: 'sum',
                sourceField: 'bytes',
                dataType: 'number',
                // No format defined - should fall back to fieldFormatMap
                interval: undefined as never,
              },
            ],
          },
          partialRows: false,
        },
      },
    ];

    const result = convertFormBasedToTextBasedLayer({
      layersToConvert: layersWithFieldFormatFromDataView,
      attributes: mockAttributes,
      visualizationState: mockVisualizationState,
      datasourceStates: mockDatasourceStates,
      framePublicAPI,
    });

    const textBasedState = result?.state.datasourceStates.textBased;
    const columns = textBasedState?.layers[layerId]?.columns;

    // Should have the format from fieldFormatMap
    expect(columns).toEqual([
      {
        columnId: 'col2',
        fieldName: 'total_bytes',
        label: 'Total Bytes',
        params: { format: { id: 'currency', params: { pattern: '$0,0.00' } } },
        meta: { type: 'number' },
      },
    ]);
  });

  it('prefers column format over data view field format', () => {
    // Create an index pattern with fieldFormatMap
    const indexPatternWithFieldFormat: IndexPattern = {
      ...mockIndexPattern,
      fieldFormatMap: {
        bytes: { id: 'currency', params: { pattern: '$0,0.00' } },
      },
    } as unknown as IndexPattern;

    const framePublicAPI = createMockFramePublicAPI({
      dataViews: {
        indexPatterns: { 'test-index-pattern': indexPatternWithFieldFormat },
        indexPatternRefs: [{ id: 'test-index-pattern', title: 'test-index', name: 'test-index' }],
      },
      dateRange: {
        fromDate: '2024-01-01T00:00:00.000Z',
        toDate: '2024-01-02T00:00:00.000Z',
      },
    });

    // Column that has its own format configured (should take precedence)
    const layersWithExplicitFormat: ConvertibleLayer[] = [
      {
        id: layerId,
        icon: 'layers',
        name: '',
        type: 'data',
        query: 'FROM test-index | STATS total_bytes = SUM(bytes)',
        isConvertibleToEsql: true,
        conversionData: {
          esAggsIdMap: {
            total_bytes: [
              {
                id: 'col2',
                label: 'Total Bytes',
                operationType: 'sum',
                sourceField: 'bytes',
                dataType: 'number',
                format: { id: 'bytes', params: { decimals: 2 } }, // Explicit format
                interval: undefined as never,
              },
            ],
          },
          partialRows: false,
        },
      },
    ];

    const result = convertFormBasedToTextBasedLayer({
      layersToConvert: layersWithExplicitFormat,
      attributes: mockAttributes,
      visualizationState: mockVisualizationState,
      datasourceStates: mockDatasourceStates,
      framePublicAPI,
    });

    const textBasedState = result?.state.datasourceStates.textBased;
    const columns = textBasedState?.layers[layerId]?.columns;

    // Should use the explicit column format, not the fieldFormatMap format
    expect(columns).toEqual([
      {
        columnId: 'col2',
        fieldName: 'total_bytes',
        label: 'Total Bytes',
        params: { format: { id: 'bytes', params: { decimals: 2 } } },
        meta: { type: 'number' },
      },
    ]);
  });
});
