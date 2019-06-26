/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getInitialState, reducer } from './state_management';
import { EditorFrameProps } from '.';
import { Datasource, Visualization } from '../../types';
import { createExpressionRendererMock } from '../mocks';

describe('editor_frame state management', () => {
  describe('initialization', () => {
    let props: EditorFrameProps;

    beforeEach(() => {
      props = {
        onError: jest.fn(),
        redirectTo: jest.fn(),
        store: {
          load: jest.fn(),
          save: jest.fn(),
        },
        datasourceMap: { testDatasource: ({} as unknown) as Datasource },
        visualizationMap: { testVis: ({ initialize: jest.fn() } as unknown) as Visualization },
        initialDatasourceId: 'testDatasource',
        initialVisualizationId: 'testVis',
        ExpressionRenderer: createExpressionRendererMock(),
      };
    });

    it('should store initial datasource and visualization', () => {
      const initialState = getInitialState(props);
      expect(initialState.datasource.activeId).toEqual('testDatasource');
      expect(initialState.visualization.activeId).toEqual('testVis');
    });

    it('should not initialize visualization but set active id', () => {
      const initialState = getInitialState(props);

      expect(initialState.visualization.state).toBe(null);
      expect(initialState.visualization.activeId).toBe('testVis');
      expect(props.visualizationMap.testVis.initialize).not.toHaveBeenCalled();
    });

    it('should not set active id if no initial visualization is passed in', () => {
      const initialState = getInitialState({ ...props, initialVisualizationId: null });

      expect(initialState.visualization.state).toEqual(null);
      expect(initialState.visualization.activeId).toEqual(null);
      expect(props.visualizationMap.testVis.initialize).not.toHaveBeenCalled();
    });
  });

  describe('state update', () => {
    it('should update the corresponding visualization state on update', () => {
      const newVisState = {};
      const newState = reducer(
        {
          datasource: {
            activeId: 'testDatasource',
            state: {},
            isLoading: false,
          },
          saving: false,
          title: 'aaa',
          visualization: {
            activeId: 'testVis',
            state: {},
          },
        },
        {
          type: 'UPDATE_VISUALIZATION_STATE',
          newState: newVisState,
        }
      );

      expect(newState.visualization.state).toBe(newVisState);
    });

    it('should update the datasource state on update', () => {
      const newDatasourceState = {};
      const newState = reducer(
        {
          datasource: {
            activeId: 'testDatasource',
            state: {},
            isLoading: false,
          },
          saving: false,
          title: 'bbb',
          visualization: {
            activeId: 'testVis',
            state: {},
          },
        },
        {
          type: 'UPDATE_DATASOURCE_STATE',
          newState: newDatasourceState,
        }
      );

      expect(newState.datasource.state).toBe(newDatasourceState);
    });

    it('should should switch active visualization', () => {
      const testVisState = {};
      const newVisState = {};
      const newState = reducer(
        {
          datasource: {
            activeId: 'testDatasource',
            state: {},
            isLoading: false,
          },
          saving: false,
          title: 'ccc',
          visualization: {
            activeId: 'testVis',
            state: testVisState,
          },
        },
        {
          type: 'SWITCH_VISUALIZATION',
          newVisualizationId: 'testVis2',
          initialState: newVisState,
        }
      );

      expect(newState.visualization.state).toBe(newVisState);
    });

    it('should should switch active visualization and update datasource state', () => {
      const testVisState = {};
      const newVisState = {};
      const newDatasourceState = {};
      const newState = reducer(
        {
          datasource: {
            activeId: 'testDatasource',
            state: {},
            isLoading: false,
          },
          saving: false,
          title: 'ddd',
          visualization: {
            activeId: 'testVis',
            state: testVisState,
          },
        },
        {
          type: 'SWITCH_VISUALIZATION',
          newVisualizationId: 'testVis2',
          initialState: newVisState,
          datasourceState: newDatasourceState,
        }
      );

      expect(newState.visualization.state).toBe(newVisState);
      expect(newState.datasource.state).toBe(newDatasourceState);
    });

    it('should should switch active datasource and purge visualization state', () => {
      const newState = reducer(
        {
          datasource: {
            activeId: 'testDatasource',
            state: {},
            isLoading: false,
          },
          saving: false,
          title: 'eee',
          visualization: {
            activeId: 'testVis',
            state: {},
          },
        },
        {
          type: 'SWITCH_DATASOURCE',
          newDatasourceId: 'testDatasource2',
        }
      );

      expect(newState.visualization.state).toEqual(null);
      expect(newState.visualization.activeId).toBe(null);
      expect(newState.datasource.activeId).toBe('testDatasource2');
      expect(newState.datasource.state).toBe(null);
    });

    it('should mark as saving', () => {
      const newState = reducer(
        {
          datasource: {
            activeId: 'a',
            state: {},
            isLoading: false,
          },
          saving: false,
          title: 'fff',
          visualization: {
            activeId: 'b',
            state: {},
          },
        },
        {
          type: 'SAVING',
        }
      );

      expect(newState.saving).toBeTruthy();
    });

    it('should mark as saved', () => {
      const newState = reducer(
        {
          datasource: {
            activeId: 'a',
            state: {},
            isLoading: false,
          },
          saving: false,
          title: 'hhh',
          visualization: {
            activeId: 'b',
            state: {},
          },
        },
        {
          type: 'SAVED',
        }
      );

      expect(newState.saving).toBeFalsy();
    });

    it('should change the persisted id', () => {
      const newState = reducer(
        {
          datasource: {
            activeId: 'a',
            state: {},
            isLoading: false,
          },
          saving: false,
          title: 'iii',
          visualization: {
            activeId: 'b',
            state: {},
          },
        },
        {
          type: 'UPDATE_PERSISTED_ID',
          id: 'baz',
        }
      );

      expect(newState.persistedId).toEqual('baz');
    });

    it('should reset the state', () => {
      const newState = reducer(
        {
          datasource: {
            activeId: 'a',
            state: {},
            isLoading: false,
          },
          saving: false,
          title: 'jjj',
          visualization: {
            activeId: 'b',
            state: {},
          },
        },
        {
          type: 'RESET',
          state: {
            datasource: {
              activeId: 'z',
              isLoading: false,
              state: { hola: 'muchacho' },
            },
            persistedId: 'bar',
            saving: false,
            title: 'lll',
            visualization: {
              activeId: 'q',
              state: { my: 'viz' },
            },
          },
        }
      );

      expect(newState).toMatchObject({
        datasource: {
          activeId: 'z',
          isLoading: false,
          state: { hola: 'muchacho' },
        },
        persistedId: 'bar',
        saving: false,
        visualization: {
          activeId: 'q',
          state: { my: 'viz' },
        },
      });
    });

    it('should load the state from the doc', () => {
      const newState = reducer(
        {
          datasource: {
            activeId: 'a',
            state: {},
            isLoading: false,
          },
          saving: false,
          title: 'mmm',
          visualization: {
            activeId: 'b',
            state: {},
          },
        },
        {
          type: 'VISUALIZATION_LOADED',
          doc: {
            datasourceType: 'a',
            id: 'b',
            state: {
              datasource: { foo: 'c' },
              visualization: { bar: 'd' },
            },
            title: 'heyo!',
            type: 'lens',
            visualizationType: 'line',
          },
        }
      );

      expect(newState).toEqual({
        datasource: {
          activeId: 'a',
          isLoading: true,
          state: {
            foo: 'c',
          },
        },
        persistedId: 'b',
        saving: false,
        title: 'heyo!',
        visualization: {
          activeId: 'line',
          state: {
            bar: 'd',
          },
        },
      });
    });
  });
});
