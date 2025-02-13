/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { toExpression } from '@kbn/interpreter';
import { faker } from '@faker-js/faker';
import { Visualization, VisualizationMap } from '../types';

export function createMockVisualization(
  id = 'testVis',
  layerIds = ['layer1']
): jest.Mocked<Visualization> {
  return {
    id,
    clearLayer: jest.fn((state, _layerId, _indexPatternId) => state),
    removeLayer: jest.fn(),
    getLayerIds: jest.fn((_state) => layerIds),
    getSupportedLayers: jest.fn(() => [{ type: LayerTypes.DATA, label: 'Data Layer' }]),
    getLayerType: jest.fn((_state, _layerId) => LayerTypes.DATA),
    visualizationTypes: [
      {
        icon: 'empty',
        id,
        label: id,
        sortPriority: 1,
        description: faker.lorem.sentence(),
      },
    ],
    appendLayer: jest.fn(),
    getVisualizationTypeId: jest.fn((_state) => id),
    getDescription: jest.fn((_state) => ({ label: id, icon: 'empty' })),
    switchVisualizationType: jest.fn((_, x) => x),
    getSuggestions: jest.fn((_options) => []),
    getRenderEventCounters: jest.fn((_state) => []),
    initialize: jest.fn((_addNewLayer, _state) => `${id} initial state`),
    getConfiguration: jest.fn((props) => ({
      groups: [
        {
          groupId: 'a',
          groupLabel: 'a',
          layerId: layerIds[0],
          supportsMoreColumns: true,
          accessors: [],
          filterOperations: jest.fn(() => true),
          dataTestSubj: 'mockVisA',
        },
      ],
    })),
    toExpression: jest.fn((state, datasourceLayers, attrs, datasourceExpressionsByLayers = {}) =>
      toExpression({
        type: 'expression',
        chain: [
          ...(datasourceExpressionsByLayers.first?.chain ?? []),
          { type: 'function', function: 'testVis', arguments: {} },
        ],
      })
    ),
    toPreviewExpression: jest.fn((_state, _frame) => 'expression'),
    getUserMessages: jest.fn((_state) => []),
    setDimension: jest.fn(),
    removeDimension: jest.fn(),
    DimensionEditorComponent: jest.fn(() => <div data-test-subj="lnsVisDimensionEditor" />),
  };
}

export const mockVisualizationMap = (): VisualizationMap => {
  return {
    testVis: createMockVisualization(),
    testVis2: createMockVisualization(),
  };
};

export const visualizationMap = mockVisualizationMap();
