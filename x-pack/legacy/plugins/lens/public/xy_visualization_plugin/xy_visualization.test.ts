/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { xyVisualization } from './xy_visualization';
import { Position } from '@elastic/charts';
import { Operation } from '../types';
import { State } from './types';
import { createMockDatasource, createMockFramePublicAPI } from '../editor_frame_plugin/mocks';
import { generateId } from '../id_generator';
import { Ast } from '@kbn/interpreter/target/common';

jest.mock('../id_generator');

function exampleState(): State {
  return {
    isHorizontal: false,
    legend: { position: Position.Bottom, isVisible: true },
    preferredSeriesType: 'bar',
    layers: [
      {
        layerId: 'first',
        seriesType: 'area',
        splitAccessor: 'd',
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
          "isHorizontal": false,
          "layers": Array [
            Object {
              "accessors": Array [
                "test-id1",
              ],
              "layerId": "",
              "position": "top",
              "seriesType": "bar_stacked",
              "showGridlines": false,
              "splitAccessor": "test-id2",
              "xAccessor": "test-id3",
            },
          ],
          "legend": Object {
            "isVisible": true,
            "position": "right",
          },
          "preferredSeriesType": "bar_stacked",
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
    let mockDatasource: ReturnType<typeof createMockDatasource>;
    let frame: ReturnType<typeof createMockFramePublicAPI>;

    beforeEach(() => {
      frame = createMockFramePublicAPI();
      mockDatasource = createMockDatasource();

      mockDatasource.publicAPIMock.getTableSpec.mockReturnValue([
        { columnId: 'd' },
        { columnId: 'a' },
        { columnId: 'b' },
        { columnId: 'c' },
      ]);

      mockDatasource.publicAPIMock.getOperationForColumnId.mockImplementation(col => {
        return { label: `col_${col}`, dataType: 'number' } as Operation;
      });

      frame.datasourceLayers = {
        first: mockDatasource.publicAPIMock,
      };
    });

    it('should map to a valid AST', () => {
      expect(xyVisualization.toExpression(exampleState(), frame)).toMatchSnapshot();
    });

    it('should default to labeling all columns with their column label', () => {
      const expression = xyVisualization.toExpression(exampleState(), frame)! as Ast;

      expect(mockDatasource.publicAPIMock.getOperationForColumnId).toHaveBeenCalledWith('b');
      expect(mockDatasource.publicAPIMock.getOperationForColumnId).toHaveBeenCalledWith('c');
      expect(mockDatasource.publicAPIMock.getOperationForColumnId).toHaveBeenCalledWith('d');
      expect(expression.chain[0].arguments.xTitle).toEqual(['col_a']);
      expect(expression.chain[0].arguments.yTitle).toEqual(['col_b']);
      expect(
        (expression.chain[0].arguments.layers[0] as Ast).chain[0].arguments.columnToLabel
      ).toEqual([
        JSON.stringify({
          b: 'col_b',
          c: 'col_c',
          d: 'col_d',
        }),
      ]);
    });
  });
});
