/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { xyVisualization } from './xy_visualization';
import { Position } from '@elastic/charts';
import { Ast } from '@kbn/interpreter/target/common';
import { Operation } from '../types';
import { State } from './types';
import { createMockDatasource, createMockFramePublicAPI } from '../editor_frame_plugin/mocks';
import { generateId } from '../id_generator';

jest.mock('../id_generator');

function exampleState(): State {
  return {
    legend: { position: Position.Bottom, isVisible: true },
    layers: [
      {
        layerId: 'first',
        datasourceId: '',
        labels: [''],
        seriesType: 'area',
        splitAccessor: 'd',
        position: Position.Bottom,
        showGridlines: true,
        title: 'Baz',
        xAccessor: 'a',
        accessors: ['b', 'c'],
      },
    ],
  };
}

describe('xy_visualization', () => {
  describe('#initialize', () => {
    it('loads default state', () => {
      (generateId as jest.Mock)
        .mockReturnValueOnce('test-id1')
        .mockReturnValueOnce('test-id2')
        .mockReturnValue('test-id3');
      const mockFrame = createMockFramePublicAPI();
      const initialState = xyVisualization.initialize(mockFrame);

      expect(initialState.layers).toHaveLength(1);
      expect(initialState.layers[0].xAccessor).toBeDefined();
      expect(initialState.layers[0].accessors[0]).toBeDefined();
      expect(initialState.layers[0].xAccessor).not.toEqual(initialState.layers[0].accessors[0]);

      expect(initialState).toMatchInlineSnapshot(`
        Object {
          "layers": Array [
            Object {
              "accessors": Array [
                "test-id1",
              ],
              "datasourceId": "",
              "labels": Array [],
              "layerId": "",
              "position": "top",
              "seriesType": "bar",
              "showGridlines": false,
              "splitAccessor": "test-id2",
              "title": "",
              "xAccessor": "test-id3",
            },
          ],
          "legend": Object {
            "isVisible": true,
            "position": "right",
          },
          "title": "Empty XY Chart",
        }
      `);
    });

    it('loads from persisted state', () => {
      expect(xyVisualization.initialize(createMockFramePublicAPI(), exampleState())).toEqual(
        exampleState()
      );
    });
  });

  describe('#getPersistableState', () => {
    it('persists the state as given', () => {
      expect(xyVisualization.getPersistableState(exampleState())).toEqual(exampleState());
    });
  });

  describe('#toExpression', () => {
    it('should map to a valid AST', () => {
      expect(
        xyVisualization.toExpression(exampleState(), createMockFramePublicAPI())
      ).toMatchSnapshot();
    });

    it('should default to labeling all columns with their column label', () => {
      const mockDatasource = createMockDatasource();

      mockDatasource.publicAPIMock.getOperationForColumnId
        .mockReturnValueOnce({
          label: 'First',
        } as Operation)
        .mockReturnValueOnce({
          label: 'Second',
        } as Operation);

      const expression = xyVisualization.toExpression(
        exampleState(),
        createMockFramePublicAPI()
      )! as Ast;

      expect(mockDatasource.publicAPIMock.getOperationForColumnId).toHaveBeenCalledTimes(2);
      expect(mockDatasource.publicAPIMock.getOperationForColumnId).toHaveBeenCalledWith('b');
      expect(mockDatasource.publicAPIMock.getOperationForColumnId).toHaveBeenCalledWith('c');
      expect((expression.chain[0].arguments.y[0] as Ast).chain[0].arguments.labels).toEqual([
        'First',
        'Second',
      ]);
    });
  });
});
