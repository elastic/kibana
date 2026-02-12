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
import type { ConvertibleLayer, EsqlConversionData } from './esql_conversion_types';

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
    getFieldByName: (name: string) =>
      ({
        '@timestamp': { name: '@timestamp', type: 'date' },
        bytes: { name: 'bytes', type: 'number' },
      }[name]),
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
    layers: { [layerId]: mockFormBasedLayer },
    currentIndexPatternId: 'test-index-pattern',
  } as unknown as FormBasedPrivateState;

  const mockDatasourceStates: DatasourceStates = {
    formBased: { state: mockFormBasedState, isLoading: false },
  };

  const mockVisualizationState = {
    layers: [{ layerId, layerType: 'data', xAccessor: 'col1', accessors: ['col2'] }],
  };

  const mockAttributes: TypedLensSerializedState['attributes'] = {
    title: 'Test',
    visualizationType: 'lnsXY',
    state: {
      query: { query: '', language: 'kuery' },
      filters: [],
      datasourceStates: { formBased: mockFormBasedState },
      visualization: mockVisualizationState,
    },
    references: [],
  } as unknown as TypedLensSerializedState['attributes'];

  // Helper to create framePublicAPI with optional fieldFormatMap
  const createFrameAPI = (fieldFormatMap?: Record<string, unknown>) => {
    const indexPattern = fieldFormatMap
      ? ({ ...mockIndexPattern, fieldFormatMap } as unknown as IndexPattern)
      : mockIndexPattern;
    return createMockFramePublicAPI({
      dataViews: {
        indexPatterns: { 'test-index-pattern': indexPattern },
        indexPatternRefs: [{ id: 'test-index-pattern', title: 'test-index', name: 'test-index' }],
      },
      dateRange: {
        fromDate: '2024-01-01T00:00:00.000Z',
        toDate: '2024-01-02T00:00:00.000Z',
      },
    });
  };

  // Helper to create ConvertibleLayer with minimal boilerplate
  const createConvertibleLayer = (
    query: string,
    esAggsIdMap: ConvertibleLayer['conversionData']['esAggsIdMap'],
    partialRows = false
  ): ConvertibleLayer => ({
    id: layerId,
    icon: 'layers',
    name: '',
    type: 'data',
    query,
    isConvertibleToEsql: true,
    conversionData: { esAggsIdMap, partialRows },
  });

  // Helper to create column mapping entry
  const createColumnMapping = (
    id: string,
    label: string,
    dataType: string,
    overrides: Record<string, unknown> = {}
  ): EsqlConversionData['esAggsIdMap'][string] => [
    {
      id,
      label,
      operationType: (overrides.operationType as string) ?? 'count',
      sourceField: (overrides.sourceField as string) ?? '___records___',
      dataType,
      interval: undefined as never,
      ...overrides,
    } as EsqlConversionData['esAggsIdMap'][string][number],
  ];

  const defaultConvertibleLayers: ConvertibleLayer[] = [
    createConvertibleLayer(
      `FROM test-index | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend | STATS bucket_0_0 = COUNT(*) BY @timestamp = BUCKET(@timestamp, 30 minutes)`,
      {
        bucket_0_0: createColumnMapping('col2', 'Count of records', 'number'),
        '@timestamp': createColumnMapping('col1', '@timestamp', 'date', {
          operationType: 'date_histogram',
          sourceField: '@timestamp',
          interval: 1800000,
        }),
      }
    ),
  ];

  beforeEach(() => jest.clearAllMocks());

  it('returns undefined when layersToConvert is empty', () => {
    expect(
      convertFormBasedToTextBasedLayer({
        layersToConvert: [],
        attributes: mockAttributes,
        visualizationState: mockVisualizationState,
        datasourceStates: mockDatasourceStates,
        framePublicAPI: createFrameAPI(),
      })
    ).toBeUndefined();
  });

  it('returns undefined when formBased state is missing', () => {
    expect(
      convertFormBasedToTextBasedLayer({
        layersToConvert: defaultConvertibleLayers,
        attributes: mockAttributes,
        visualizationState: mockVisualizationState,
        datasourceStates: {},
        framePublicAPI: createFrameAPI(),
      })
    ).toBeUndefined();
  });

  it('returns undefined when layer ID does not exist', () => {
    const nonExistentLayer = createConvertibleLayer('FROM test-index | STATS count = COUNT(*)', {});
    nonExistentLayer.id = 'non-existent-layer';
    expect(
      convertFormBasedToTextBasedLayer({
        layersToConvert: [nonExistentLayer],
        attributes: mockAttributes,
        visualizationState: mockVisualizationState,
        datasourceStates: mockDatasourceStates,
        framePublicAPI: createFrameAPI(),
      })
    ).toBeUndefined();
  });

  it('converts a form-based layer to text-based successfully', () => {
    const result = convertFormBasedToTextBasedLayer({
      layersToConvert: defaultConvertibleLayers,
      attributes: mockAttributes,
      visualizationState: mockVisualizationState,
      datasourceStates: mockDatasourceStates,
      framePublicAPI: createFrameAPI(),
    });

    expect(result).toBeDefined();
    expect(result?.state.datasourceStates.textBased).toBeDefined();
    expect(result?.state.query).toEqual({ esql: defaultConvertibleLayers[0].query });
  });

  it('preserves original column IDs in visualization state', () => {
    const result = convertFormBasedToTextBasedLayer({
      layersToConvert: defaultConvertibleLayers,
      attributes: mockAttributes,
      visualizationState: mockVisualizationState,
      datasourceStates: mockDatasourceStates,
      framePublicAPI: createFrameAPI(),
    });

    expect(result?.state.visualization).toEqual(mockVisualizationState);
    expect(result?.state.datasourceStates.textBased?.layers[layerId]?.columns).toEqual([
      {
        columnId: 'col2',
        fieldName: 'bucket_0_0',
        label: 'Count of records',
        meta: { type: 'number' },
      },
      { columnId: 'col1', fieldName: '@timestamp', label: '@timestamp', meta: { type: 'date' } },
    ]);
  });

  it('works with visualization states without layers array', () => {
    const metricVisualizationState = { layerId, layerType: 'data', accessor: 'col2' };
    const result = convertFormBasedToTextBasedLayer({
      layersToConvert: defaultConvertibleLayers,
      attributes: mockAttributes,
      visualizationState: metricVisualizationState,
      datasourceStates: mockDatasourceStates,
      framePublicAPI: createFrameAPI(),
    });

    expect(result?.state.visualization).toEqual(metricVisualizationState);
    expect(
      result?.state.datasourceStates.textBased?.layers[layerId]?.columns?.map((c) => c.columnId)
    ).toEqual(['col2', 'col1']);
  });

  describe('column properties preservation', () => {
    it.each([
      ['custom labels', { customLabel: true }, { customLabel: true }],
      [
        'format',
        { format: { id: 'bytes', params: { decimals: 2 } } },
        { params: { format: { id: 'bytes', params: { decimals: 2 } } } },
      ],
      [
        'custom label and format',
        { customLabel: true, format: { id: 'bytes', params: { decimals: 1 } } },
        { customLabel: true, params: { format: { id: 'bytes', params: { decimals: 1 } } } },
      ],
    ])('preserves %s', (_, inputOverrides, expectedOverrides) => {
      const layers = [
        createConvertibleLayer('FROM test-index | STATS my_count = COUNT(*)', {
          my_count: createColumnMapping('col2', 'My Label', 'number', inputOverrides),
        }),
      ];

      const result = convertFormBasedToTextBasedLayer({
        layersToConvert: layers,
        attributes: mockAttributes,
        visualizationState: mockVisualizationState,
        datasourceStates: mockDatasourceStates,
        framePublicAPI: createFrameAPI(),
      });

      expect(result?.state.datasourceStates.textBased?.layers[layerId]?.columns?.[0]).toEqual({
        columnId: 'col2',
        fieldName: 'my_count',
        label: 'My Label',
        meta: { type: 'number' },
        ...expectedOverrides,
      });
    });

    it('does not include params when format is undefined', () => {
      const layers = [
        createConvertibleLayer('FROM test-index | STATS my_count = COUNT(*)', {
          my_count: createColumnMapping('col2', 'Count', 'number'),
        }),
      ];

      const result = convertFormBasedToTextBasedLayer({
        layersToConvert: layers,
        attributes: mockAttributes,
        visualizationState: mockVisualizationState,
        datasourceStates: mockDatasourceStates,
        framePublicAPI: createFrameAPI(),
      });

      const column = result?.state.datasourceStates.textBased?.layers[layerId]?.columns?.[0];
      expect(column).not.toHaveProperty('params');
      expect(column).not.toHaveProperty('customLabel');
    });
  });

  describe('field format fallback', () => {
    const fieldFormatMap = { bytes: { id: 'currency', params: { pattern: '$0,0.00' } } };

    it('uses data view field format when column has no format', () => {
      const layers = [
        createConvertibleLayer('FROM test-index | STATS total_bytes = SUM(bytes)', {
          total_bytes: createColumnMapping('col2', 'Total Bytes', 'number', {
            operationType: 'sum',
            sourceField: 'bytes',
          }),
        }),
      ];

      const result = convertFormBasedToTextBasedLayer({
        layersToConvert: layers,
        attributes: mockAttributes,
        visualizationState: mockVisualizationState,
        datasourceStates: mockDatasourceStates,
        framePublicAPI: createFrameAPI(fieldFormatMap),
      });

      expect(
        result?.state.datasourceStates.textBased?.layers[layerId]?.columns?.[0]?.params
      ).toEqual({
        format: { id: 'currency', params: { pattern: '$0,0.00' } },
      });
    });

    it('prefers column format over data view field format', () => {
      const layers = [
        createConvertibleLayer('FROM test-index | STATS total_bytes = SUM(bytes)', {
          total_bytes: createColumnMapping('col2', 'Total Bytes', 'number', {
            operationType: 'sum',
            sourceField: 'bytes',
            format: { id: 'bytes', params: { decimals: 2 } },
          }),
        }),
      ];

      const result = convertFormBasedToTextBasedLayer({
        layersToConvert: layers,
        attributes: mockAttributes,
        visualizationState: mockVisualizationState,
        datasourceStates: mockDatasourceStates,
        framePublicAPI: createFrameAPI(fieldFormatMap),
      });

      expect(
        result?.state.datasourceStates.textBased?.layers[layerId]?.columns?.[0]?.params
      ).toEqual({
        format: { id: 'bytes', params: { decimals: 2 } },
      });
    });
  });
});
