/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type {
  FormBasedPrivateState,
  TypedLensSerializedState,
  DatasourceStates,
  IndexPattern,
} from '@kbn/lens-common';
import { coreMock } from '@kbn/core/public/mocks';
import { createMockFramePublicAPI } from '../../../mocks';
import { createMockStartDependencies } from '../../../editor_frame_service/mocks';
import type { LensPluginStartDependencies } from '../../../plugin';
import { convertFormBasedToTextBasedLayer } from './convert_to_text_based_layer';

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

  let coreStart: CoreStart;
  let startDependencies: LensPluginStartDependencies;

  const defaultUiSettingsGet = (key: string) => {
    switch (key) {
      case 'dateFormat':
        return 'MMM D, YYYY @ HH:mm:ss.SSS';
      case 'dateFormat:scaled':
        return [[]];
      case 'dateFormat:tz':
        return 'UTC';
      case 'histogram:barTarget':
        return 50;
      case 'histogram:maxBars':
        return 100;
      default:
        return undefined;
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    coreStart = coreMock.createStart();
    coreStart.uiSettings.get.mockImplementation(defaultUiSettingsGet);

    startDependencies = createMockStartDependencies() as unknown as LensPluginStartDependencies;
    startDependencies.data.nowProvider.get.mockReturnValue(new Date('2024-01-01T00:00:00.000Z'));
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
      coreStart,
      startDependencies,
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
      layersToConvert: [layerId],
      attributes: mockAttributes,
      visualizationState: mockVisualizationState,
      datasourceStates: {},
      framePublicAPI,
      coreStart,
      startDependencies,
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
      layersToConvert: [layerId],
      attributes: mockAttributes,
      visualizationState: { noLayers: true },
      datasourceStates: mockDatasourceStates,
      framePublicAPI,
      coreStart,
      startDependencies,
    });

    expect(result).toBeUndefined();
  });

  it('returns undefined when index pattern is not found', () => {
    const framePublicAPI = createMockFramePublicAPI({
      dataViews: {
        indexPatterns: {}, // No index patterns
        indexPatternRefs: [],
      },
    });

    const result = convertFormBasedToTextBasedLayer({
      layersToConvert: [layerId],
      attributes: mockAttributes,
      visualizationState: mockVisualizationState,
      datasourceStates: mockDatasourceStates,
      framePublicAPI,
      coreStart,
      startDependencies,
    });

    expect(result).toBeUndefined();
  });

  it('returns undefined when layer to convert does not exist', () => {
    const framePublicAPI = createMockFramePublicAPI({
      dataViews: {
        indexPatterns: { 'test-index-pattern': mockIndexPattern },
        indexPatternRefs: [{ id: 'test-index-pattern', title: 'test-index', name: 'test-index' }],
      },
    });

    const result = convertFormBasedToTextBasedLayer({
      layersToConvert: ['non-existent-layer'],
      attributes: mockAttributes,
      visualizationState: mockVisualizationState,
      datasourceStates: mockDatasourceStates,
      framePublicAPI,
      coreStart,
      startDependencies,
    });

    expect(result).toBeUndefined();
  });

  it('converts a form-based layer to text-based successfully', () => {
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
      layersToConvert: [layerId],
      attributes: mockAttributes,
      visualizationState: mockVisualizationState,
      datasourceStates: mockDatasourceStates,
      framePublicAPI,
      coreStart,
      startDependencies,
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

  it('remaps column IDs in visualization state', () => {
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
      layersToConvert: [layerId],
      attributes: mockAttributes,
      visualizationState: mockVisualizationState,
      datasourceStates: mockDatasourceStates,
      framePublicAPI,
      coreStart,
      startDependencies,
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
});
