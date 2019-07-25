/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { save, Props } from './save';
import { Action } from './state_management';
import { createMockDatasource, createMockVisualization } from '../mocks';

describe('save editor frame state', () => {
  const mockVisualization = createMockVisualization();
  mockVisualization.getPersistableState.mockImplementation(x => x);
  const mockDatasource = createMockDatasource();
  mockDatasource.getPersistableState.mockImplementation(x => x);
  const saveArgs: Props = {
    dispatch: jest.fn(),
    redirectTo: jest.fn(),
    activeDatasources: {
      indexpattern: mockDatasource,
    },
    visualization: mockVisualization,
    state: {
      title: 'aaa',
      datasourceStates: {
        indexpattern: {
          state: 'hello',
          isLoading: false,
        },
      },
      activeDatasourceId: 'indexpattern',
      saving: false,
      visualization: { activeId: '2', state: {} },
    },
    activeDatasourceId: 'indexpattern',
    framePublicAPI: {
      addNewLayer: jest.fn(),
      removeLayer: jest.fn(),
      datasourceLayers: {
        first: mockDatasource.publicAPIMock,
      },
    },
    store: {
      async save() {
        return { id: 'foo' };
      },
    },
  };

  it('dispatches saved status actions before and after saving', async () => {
    let saved = false;

    const dispatch = jest.fn((action: Action) => {
      if (
        (action.type === 'SAVING' && action.isSaving && saved) ||
        (action.type === 'SAVING' && !action.isSaving && !saved)
      ) {
        throw new Error('Saving status was incorrectly set' + action.isSaving + ' ' + saved);
      }
    });

    await save({
      ...saveArgs,
      dispatch,
      store: {
        async save() {
          saved = true;
          return { id: 'foo' };
        },
      },
    });

    expect(dispatch).toHaveBeenCalledWith({ type: 'SAVING', isSaving: true });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SAVING', isSaving: false });
  });

  it('allows saves if an error occurs', async () => {
    const dispatch = jest.fn();

    await expect(
      save({
        ...saveArgs,
        dispatch,
        store: {
          async save() {
            throw new Error('aw shnap!');
          },
        },
      })
    ).rejects.toThrow();

    expect(dispatch).toHaveBeenCalledWith({ type: 'SAVING', isSaving: true });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SAVING', isSaving: false });
  });

  it('transforms from internal state to persisted doc format', async () => {
    const store = {
      save: jest.fn(async () => ({ id: 'bar' })),
    };
    const datasource = createMockDatasource();
    datasource.getPersistableState.mockImplementation(state => ({
      stuff: `${state}_datasource_persisted`,
    }));

    const visualization = createMockVisualization();
    visualization.getPersistableState.mockImplementation(state => ({
      things: `${state}_vis_persisted`,
    }));
    await save({
      ...saveArgs,
      activeDatasources: {
        indexpattern: datasource,
      },
      store,
      state: {
        title: 'bbb',
        datasourceStates: {
          indexpattern: {
            state: '2',
            isLoading: false,
          },
        },
        activeDatasourceId: 'indexpattern',
        saving: false,
        visualization: { activeId: '3', state: '4' },
      },
      visualization,
    });

    expect(store.save).toHaveBeenCalledWith({
      activeDatasourceId: 'indexpattern',
      id: undefined,
      expression: '',
      state: {
        datasourceMetaData: {
          filterableIndexPatterns: [],
        },
        datasourceStates: {
          indexpattern: {
            stuff: '2_datasource_persisted',
          },
        },
        visualization: { things: '4_vis_persisted' },
      },
      title: 'bbb',
      type: 'lens',
      visualizationType: '3',
    });
  });

  it('redirects to the edit screen if the id changes', async () => {
    const redirectTo = jest.fn();
    const dispatch = jest.fn();
    await save({
      ...saveArgs,
      dispatch,
      redirectTo,
      state: {
        title: 'ccc',
        datasourceStates: {
          indexpattern: {
            state: {},
            isLoading: false,
          },
        },
        activeDatasourceId: 'indexpattern',
        saving: false,
        visualization: { activeId: '2', state: {} },
      },
      store: {
        async save() {
          return { id: 'bazinga' };
        },
      },
    });

    expect(dispatch).toHaveBeenCalledWith({ type: 'UPDATE_PERSISTED_ID', id: 'bazinga' });
    expect(redirectTo).toHaveBeenCalledWith('/edit/bazinga');
  });

  it('does not redirect to the edit screen if the id does not change', async () => {
    const redirectTo = jest.fn();
    const dispatch = jest.fn();
    await save({
      ...saveArgs,
      dispatch,
      redirectTo,
      state: {
        title: 'ddd',
        datasourceStates: {
          indexpattern: {
            state: {},
            isLoading: false,
          },
        },
        activeDatasourceId: 'indexpattern',
        persistedId: 'foo',
        saving: false,
        visualization: { activeId: '2', state: {} },
      },
      store: {
        async save() {
          return { id: 'foo' };
        },
      },
    });

    expect(dispatch.mock.calls.some(({ type }) => type === 'UPDATE_PERSISTED_ID')).toBeFalsy();
    expect(redirectTo).not.toHaveBeenCalled();
  });
});
