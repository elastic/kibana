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
              interval: undefined as never,
            },
          ],
          '@timestamp': [
            {
              id: 'col1',
              label: '@timestamp',
              operationType: 'date_histogram',
              sourceField: '@timestamp',
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

  it('returns undefined when visualization state has no layers', () => {
    const framePublicAPI = createMockFramePublicAPI({
      dataViews: {
        indexPatterns: { 'test-index-pattern': mockIndexPattern },
        indexPatternRefs: [{ id: 'test-index-pattern', title: 'test-index', name: 'test-index' }],
      },
    });

    const result = convertFormBasedToTextBasedLayer({
      layersToConvert: mockConvertibleLayers,
      attributes: mockAttributes,
      visualizationState: { noLayers: true },
      datasourceStates: mockDatasourceStates,
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
                      "columnId": "bucket_0_0",
                      "fieldName": "bucket_0_0",
                      "meta": Object {
                        "type": "number",
                      },
                    },
                    Object {
                      "columnId": "@timestamp",
                      "fieldName": "@timestamp",
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
                  "bucket_0_0",
                ],
                "layerId": "layer1",
                "layerType": "data",
                "xAccessor": "@timestamp",
              },
            ],
          },
        },
        "title": "Test",
        "visualizationType": "lnsXY",
      }
    `);
  });

  it('remaps column IDs in visualization state using pre-computed data', () => {
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

    // Original column IDs (col1, col2) should be remapped to ES|QL field names
    expect(result?.state.visualization).toMatchInlineSnapshot(`
      Object {
        "layers": Array [
          Object {
            "accessors": Array [
              "bucket_0_0",
            ],
            "layerId": "layer1",
            "layerType": "data",
            "xAccessor": "@timestamp",
          },
        ],
      }
    `);
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
                interval: undefined as never,
              },
            ],
            custom_timestamp: [
              {
                id: 'col1',
                label: '@timestamp',
                operationType: 'date_histogram',
                sourceField: '@timestamp',
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

    // Should use the pre-computed column mappings
    expect(result?.state.visualization).toMatchInlineSnapshot(`
      Object {
        "layers": Array [
          Object {
            "accessors": Array [
              "custom_count",
            ],
            "layerId": "layer1",
            "layerType": "data",
            "xAccessor": "custom_timestamp",
          },
        ],
      }
    `);

    // Verify the text-based layer uses the pre-computed query
    const textBasedState = result?.state.datasourceStates.textBased;
    expect(textBasedState?.layers[layerId]?.query).toEqual({ esql: preComputedEsql });
  });
});
