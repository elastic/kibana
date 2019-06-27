/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { DataSetup, ExpressionRendererProps } from 'src/legacy/core_plugins/data/public';
import { DatasourcePublicAPI, Visualization, Datasource } from '../types';
import { EditorFrameSetupPlugins } from './plugin';

export function createMockVisualization(): jest.Mocked<Visualization> {
  return {
    getPersistableState: jest.fn(_state => ({})),
    getSuggestions: jest.fn(_options => []),
    initialize: jest.fn(_state => ({})),
    renderConfigPanel: jest.fn(),
    toExpression: jest.fn((_state, _datasource) => null),
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
    removeColumnInTableSpec: jest.fn(),
    moveColumnTo: jest.fn(),
    duplicateColumn: jest.fn(),
  };

  return {
    getDatasourceSuggestionsForField: jest.fn((_state, item) => []),
    getDatasourceSuggestionsFromCurrentState: jest.fn(_state => []),
    getPersistableState: jest.fn(),
    getPublicAPI: jest.fn((_state, _setState) => publicAPIMock),
    initialize: jest.fn(_state => Promise.resolve()),
    renderDataPanel: jest.fn(),
    toExpression: jest.fn(_state => null),

    // this is an additional property which doesn't exist on real datasources
    // but can be used to validate whether specific API mock functions are called
    publicAPIMock,
  };
}

type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

export type MockedDependencies = Omit<EditorFrameSetupPlugins, 'data'> & {
  data: Omit<DataSetup, 'expressions'> & { expressions: jest.Mocked<DataSetup['expressions']> };
};

export function createExpressionRendererMock(): jest.Mock<
  React.ReactElement,
  [ExpressionRendererProps]
> {
  return jest.fn(_ => <span />);
}

export function createMockDependencies() {
  return ({
    data: {
      expressions: {
        ExpressionRenderer: createExpressionRendererMock(),
        run: jest.fn(_ => Promise.resolve({ type: 'render', as: 'test', value: undefined })),
      },
    },
  } as unknown) as MockedDependencies;
}
