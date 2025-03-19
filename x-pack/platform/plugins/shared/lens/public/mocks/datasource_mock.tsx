/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { DatasourcePublicAPI, Datasource } from '../types';

export type DatasourceMock = jest.Mocked<Datasource> & {
  publicAPIMock: jest.Mocked<DatasourcePublicAPI>;
};

export function createMockDatasource(
  id = 'testDatasource',
  customPublicApi: Partial<DatasourcePublicAPI> = {}
): DatasourceMock {
  const publicAPIMock = {
    datasourceId: id,
    getTableSpec: jest.fn(() => []),
    getOperationForColumnId: jest.fn(),
    getVisualDefaults: jest.fn(),
    getSourceId: jest.fn(),
    getFilters: jest.fn(),
    getMaxPossibleNumValues: jest.fn(),
    isTextBasedLanguage: jest.fn(() => false),
    hasDefaultTimeField: jest.fn(() => true),
    ...customPublicApi,
  } as jest.Mocked<DatasourcePublicAPI>;

  return {
    id: 'testDatasource',
    clearLayer: jest.fn((state, _layerId) => ({ newState: state, removedLayerIds: [] })),
    getDatasourceSuggestionsForField: jest.fn((_state, _item, filterFn, _indexPatterns) => []),
    getDatasourceSuggestionsForVisualizeField: jest.fn(
      (_state, _indexpatternId, _fieldName, _indexPatterns) => []
    ),
    getDatasourceSuggestionsForVisualizeCharts: jest.fn((_state, _context, _indexPatterns) => []),
    getDatasourceSuggestionsFromCurrentState: jest.fn((_state, _indexPatterns) => []),
    getPersistableState: jest.fn((x) => ({
      state: x,
      savedObjectReferences: [{ type: 'index-pattern', id: 'mockip', name: 'mockip' }],
    })),
    getRenderEventCounters: jest.fn((_state) => []),
    getPublicAPI: jest.fn().mockReturnValue(publicAPIMock),
    initialize: jest.fn((_state?) => {}),
    toExpression: jest.fn(
      (_frame, _state, _indexPatterns, dateRange, nowInstant) => 'datasource_expression'
    ),
    insertLayer: jest.fn((_state, _newLayerId) => ({})),
    removeLayer: jest.fn((state, layerId) => ({ newState: state, removedLayerIds: [layerId] })),
    cloneLayer: jest.fn((_state, _layerId, _newLayerId, getNewId) => {}),
    removeColumn: jest.fn((props) => {}),
    getLayers: jest.fn((_state) => ['a']),
    uniqueLabels: jest.fn((_state, dataViews) => ({})),
    getDropProps: jest.fn(),
    onDrop: jest.fn(),
    createEmptyLayer: jest.fn(),
    syncColumns: jest.fn(),

    // this is an additional property which doesn't exist on real datasources
    // but can be used to validate whether specific API mock functions are called
    publicAPIMock,
    getUserMessages: jest.fn((_state, _deps) => []),
    checkIntegrity: jest.fn((_state, _indexPatterns) => []),
    isTimeBased: jest.fn(),
    isEqual: jest.fn((a, b, c, d) => a === c),
    getUsedDataView: jest.fn((state, layer) => 'mockip'),
    getUsedDataViews: jest.fn(),
    onRefreshIndexPattern: jest.fn(),
    getDatasourceInfo: jest.fn(),

    DataPanelComponent: jest.fn().mockImplementation(() => <div />),
    LayerPanelComponent: jest.fn().mockImplementation(() => <div />),
    DimensionTriggerComponent: jest.fn().mockImplementation(() => <div />),
    DimensionEditorComponent: jest.fn().mockImplementation(() => <div />),
  };
}

export function mockDatasourceMap() {
  const datasource = createMockDatasource();
  datasource.getDatasourceSuggestionsFromCurrentState.mockReturnValue([
    {
      state: {},
      table: {
        columns: [],
        isMultiRow: true,
        layerId: 'a',
        changeType: 'unchanged',
      },
      keptLayerIds: ['a'],
    },
  ]);

  datasource.getLayers.mockReturnValue(['a']);
  return {
    testDatasource2: createMockDatasource('testDatasource2'),
    testDatasource: datasource,
  };
}

export const datasourceMap = mockDatasourceMap();
