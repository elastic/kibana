/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { metricVisualization } from './metric_visualization';
import { State } from './types';
import { createMockDatasource, createMockFramePublicAPI } from '../editor_frame_plugin/mocks';
import { generateId } from '../id_generator';
import { DatasourcePublicAPI, FramePublicAPI } from '../types';

jest.mock('../id_generator');

function exampleState(): State {
  return {
    accessor: 'a',
    layerId: 'l1',
  };
}

function mockFrame(): FramePublicAPI {
  return {
    ...createMockFramePublicAPI(),
    addNewLayer: () => 'l42',
    datasourceLayers: {
      l1: createMockDatasource().publicAPIMock,
      l42: createMockDatasource().publicAPIMock,
    },
  };
}

describe('metric_visualization', () => {
  describe('#initialize', () => {
    it('loads default state', () => {
      (generateId as jest.Mock).mockReturnValueOnce('test-id1');
      const initialState = metricVisualization.initialize(mockFrame());

      expect(initialState.accessor).toBeDefined();
      expect(initialState).toMatchInlineSnapshot(`
                Object {
                  "accessor": "test-id1",
                  "layerId": "l42",
                }
            `);
    });

    it('loads from persisted state', () => {
      expect(metricVisualization.initialize(mockFrame(), exampleState())).toEqual(exampleState());
    });
  });

  describe('#getPersistableState', () => {
    it('persists the state as given', () => {
      expect(metricVisualization.getPersistableState(exampleState())).toEqual(exampleState());
    });
  });

  describe('#toExpression', () => {
    it('should map to a valid AST', () => {
      const datasource: DatasourcePublicAPI = {
        ...createMockDatasource().publicAPIMock,
        getOperationForColumnId(_: string) {
          return {
            id: 'a',
            dataType: 'number',
            isBucketed: false,
            label: 'shazm',
          };
        },
      };

      const frame = {
        ...mockFrame(),
        datasourceLayers: { l1: datasource },
      };

      expect(metricVisualization.toExpression(exampleState(), frame)).toMatchInlineSnapshot(`
        Object {
          "chain": Array [
            Object {
              "arguments": Object {
                "accessor": Array [
                  "a",
                ],
                "mode": Array [
                  "full",
                ],
                "title": Array [
                  "shazm",
                ],
              },
              "function": "lens_metric_chart",
              "type": "function",
            },
          ],
          "type": "expression",
        }
      `);
    });
  });
});
