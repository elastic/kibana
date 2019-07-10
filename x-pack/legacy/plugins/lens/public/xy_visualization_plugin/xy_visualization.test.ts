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
import { createMockDatasource } from '../editor_frame_plugin/mocks';

function exampleState(): State {
  return {
    legend: { position: Position.Bottom, isVisible: true },
    seriesType: 'area',
    splitSeriesAccessors: [],
    x: {
      accessor: 'a',
      position: Position.Bottom,
      showGridlines: true,
      title: 'Baz',
    },
    y: {
      accessors: ['b', 'c'],
      position: Position.Left,
      showGridlines: true,
      title: 'Bar',
    },
  };
}

describe('xy_visualization', () => {
  describe('#initialize', () => {
    it('loads default state', () => {
      const mockDatasource = createMockDatasource();
      mockDatasource.publicAPIMock.generateColumnId
        .mockReturnValue('test-id1')
        .mockReturnValueOnce('test-id2');
      const initialState = xyVisualization.initialize(mockDatasource.publicAPIMock);

      expect(initialState.x.accessor).toBeDefined();
      expect(initialState.y.accessors[0]).toBeDefined();
      expect(initialState.x.accessor).not.toEqual(initialState.y.accessors[0]);

      expect(initialState).toMatchInlineSnapshot(`
        Object {
          "legend": Object {
            "isVisible": true,
            "position": "right",
          },
          "seriesType": "bar",
          "splitSeriesAccessors": Array [],
          "title": "Empty XY Chart",
          "x": Object {
            "accessor": "test-id2",
            "position": "bottom",
            "showGridlines": false,
            "title": "X",
          },
          "y": Object {
            "accessors": Array [
              "test-id1",
            ],
            "position": "left",
            "showGridlines": false,
            "title": "Y",
          },
        }
      `);
    });

    it('loads from persisted state', () => {
      expect(
        xyVisualization.initialize(createMockDatasource().publicAPIMock, exampleState())
      ).toEqual(exampleState());
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
        xyVisualization.toExpression(exampleState(), createMockDatasource().publicAPIMock)
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
        mockDatasource.publicAPIMock
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
