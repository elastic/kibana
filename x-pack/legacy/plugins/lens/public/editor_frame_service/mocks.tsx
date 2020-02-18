/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  ReactExpressionRendererProps,
  ExpressionsSetup,
  ExpressionsStart,
} from '../../../../../../src/plugins/expressions/public';
import { embeddablePluginMock } from '../../../../../../src/plugins/embeddable/public/mocks';
import { expressionsPluginMock } from '../../../../../../src/plugins/expressions/public/mocks';
import { DatasourcePublicAPI, FramePublicAPI, Datasource, Visualization } from '../types';
import { EditorFrameSetupPlugins, EditorFrameStartPlugins } from './service';
import { dataPluginMock } from '../../../../../../src/plugins/data/public/mocks';

export function createMockVisualization(): jest.Mocked<Visualization> {
  return {
    id: 'TEST_VIS',
    clearLayer: jest.fn((state, _layerId) => state),
    getLayerIds: jest.fn(_state => ['layer1']),
    visualizationTypes: [
      {
        icon: 'empty',
        id: 'TEST_VIS',
        label: 'TEST',
      },
    ],
    getDescription: jest.fn(_state => ({ label: '' })),
    switchVisualizationType: jest.fn((_, x) => x),
    getPersistableState: jest.fn(_state => _state),
    getSuggestions: jest.fn(_options => []),
    initialize: jest.fn((_frame, _state?) => ({})),
    renderLayerConfigPanel: jest.fn(),
    toExpression: jest.fn((_state, _frame) => null),
    toPreviewExpression: jest.fn((_state, _frame) => null),
  };
}

export type DatasourceMock = jest.Mocked<Datasource> & {
  publicAPIMock: jest.Mocked<DatasourcePublicAPI>;
};

export function createMockDatasource(): DatasourceMock {
  const publicAPIMock: jest.Mocked<DatasourcePublicAPI> = {
    getTableSpec: jest.fn(() => []),
    getOperationForColumnId: jest.fn(),
    renderDimensionPanel: jest.fn(),
    renderLayerPanel: jest.fn(),
  };

  return {
    id: 'mockindexpattern',
    clearLayer: jest.fn((state, _layerId) => state),
    getDatasourceSuggestionsForField: jest.fn((_state, _item) => []),
    getDatasourceSuggestionsFromCurrentState: jest.fn(_state => []),
    getPersistableState: jest.fn(),
    getPublicAPI: jest.fn().mockReturnValue(publicAPIMock),
    initialize: jest.fn((_state?) => Promise.resolve()),
    renderDataPanel: jest.fn(),
    toExpression: jest.fn((_frame, _state) => null),
    insertLayer: jest.fn((_state, _newLayerId) => {}),
    removeLayer: jest.fn((_state, _layerId) => {}),
    getLayers: jest.fn(_state => []),
    getMetaData: jest.fn(_state => ({ filterableIndexPatterns: [] })),

    // this is an additional property which doesn't exist on real datasources
    // but can be used to validate whether specific API mock functions are called
    publicAPIMock,
  };
}

export type FrameMock = jest.Mocked<FramePublicAPI>;

export function createMockFramePublicAPI(): FrameMock {
  return {
    datasourceLayers: {},
    addNewLayer: jest.fn(() => ''),
    removeLayers: jest.fn(),
    dateRange: { fromDate: 'now-7d', toDate: 'now' },
    query: { query: '', language: 'lucene' },
    filters: [],
  };
}

type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

export type MockedSetupDependencies = Omit<EditorFrameSetupPlugins, 'expressions'> & {
  expressions: jest.Mocked<ExpressionsSetup>;
};

export type MockedStartDependencies = Omit<EditorFrameStartPlugins, 'expressions'> & {
  expressions: jest.Mocked<ExpressionsStart>;
};

export function createExpressionRendererMock(): jest.Mock<
  React.ReactElement,
  [ReactExpressionRendererProps]
> {
  return jest.fn(_ => <span />);
}

export function createMockSetupDependencies() {
  return ({
    data: dataPluginMock.createSetupContract(),
    embeddable: embeddablePluginMock.createSetupContract(),
    expressions: expressionsPluginMock.createSetupContract(),
  } as unknown) as MockedSetupDependencies;
}

export function createMockStartDependencies() {
  return ({
    data: dataPluginMock.createSetupContract(),
    embeddable: embeddablePluginMock.createStartContract(),
    expressions: expressionsPluginMock.createStartContract(),
  } as unknown) as MockedStartDependencies;
}
