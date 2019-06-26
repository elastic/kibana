/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { save, Props } from './save';
import { Action } from './state_management';

describe('save editor frame state', () => {
  const saveArgs: Props = {
    dispatch: jest.fn(),
    redirectTo: jest.fn(),
    datasource: { getPersistableState: x => x },
    visualization: { getPersistableState: x => x },
    state: {
      title: 'aaa',
      datasource: { activeId: '1', isLoading: false, state: {} },
      saving: false,
      visualization: { activeId: '2', state: {} },
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
      if (action.type === 'SAVING' && saved) {
        throw new Error('Saving was called after save');
      }
      if (action.type === 'SAVED' && !saved) {
        throw new Error('Saved was called before save');
      }
    });

    await save({
      ...saveArgs,
      dispatch,
      state: {
        title: 'aaa',
        datasource: { activeId: '1', isLoading: false, state: {} },
        saving: false,
        visualization: { activeId: '2', state: {} },
      },
      store: {
        async save() {
          saved = true;
          return { id: 'foo' };
        },
      },
    });

    expect(dispatch).toHaveBeenCalledWith({ type: 'SAVING' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SAVED' });
  });

  it('allows saves if an error occurs', async () => {
    const dispatch = jest.fn();

    await expect(
      save({
        ...saveArgs,
        dispatch,
        state: {
          title: 'aaa',
          datasource: { activeId: '1', isLoading: false, state: {} },
          saving: false,
          visualization: { activeId: '2', state: {} },
        },
        store: {
          async save() {
            throw new Error('aw shnap!');
          },
        },
      })
    ).rejects.toThrow();

    expect(dispatch).toHaveBeenCalledWith({ type: 'SAVING' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'SAVED' });
  });

  it('transforms from internal state to persisted doc format', async () => {
    const store = {
      save: jest.fn(async () => ({ id: 'bar' })),
    };
    await save({
      ...saveArgs,
      store,
      datasource: {
        getPersistableState(state) {
          return {
            stuff: `${state}_datsource_persisted`,
          };
        },
      },
      state: {
        title: 'bbb',
        datasource: { activeId: '1', isLoading: false, state: '2' },
        saving: false,
        visualization: { activeId: '3', state: '4' },
      },
      visualization: {
        getPersistableState(state) {
          return {
            things: `${state}_vis_persisted`,
          };
        },
      },
    });

    expect(store.save).toHaveBeenCalledWith({
      datasourceType: '1',
      id: undefined,
      state: {
        datasource: { stuff: '2_datsource_persisted' },
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
        datasource: { activeId: '1', isLoading: false, state: {} },
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
        datasource: { activeId: '1', isLoading: false, state: {} },
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
