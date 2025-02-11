/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Action, Dispatch, MiddlewareAPI } from '@reduxjs/toolkit';
import { makeConfigureStore, onActiveDataChange, setExecutionContext } from '.';
import { mockStoreDeps } from '../mocks';
import { TableInspectorAdapter } from '../editor_frame_service/types';
import { Filter } from '@kbn/es-query';

describe('state management initialization and middlewares', () => {
  let store: ReturnType<typeof makeConfigureStore>;
  const updaterFn = jest.fn();
  const customMiddleware = jest.fn(
    (updater) => (_store: MiddlewareAPI) => (next: Dispatch) => (action: Action) => {
      next(action);
      updater(action);
    }
  );
  beforeEach(() => {
    store = makeConfigureStore(mockStoreDeps(), undefined, customMiddleware(updaterFn));
    store.dispatch = jest.fn(store.dispatch);
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('customMiddleware', () => {
    test('customMiddleware is initialized on store creation', () => {
      expect(customMiddleware).toHaveBeenCalled();
      expect(updaterFn).not.toHaveBeenCalled();
    });
    test('customMiddleware is run on action dispatch', () => {
      store.dispatch({ type: 'ANY_TYPE' });
      expect(updaterFn).toHaveBeenCalledWith({ type: 'ANY_TYPE' });
    });
  });

  describe('optimizingMiddleware', () => {
    test('state is updating when the activeData changes', () => {
      expect(store.getState().lens.activeData).toEqual(undefined);
      store.dispatch(
        onActiveDataChange({ activeData: { id: 1 } as unknown as TableInspectorAdapter })
      );
      expect(store.getState().lens.activeData).toEqual({ id: 1 });
      // this is a bit convoluted - we are checking that the updaterFn has been called because it's called (as the next middleware)
      // before the reducer function but we're actually interested in the reducer function being called that's further down the pipeline
      expect(updaterFn).toHaveBeenCalledTimes(1);
      store.dispatch(
        onActiveDataChange({ activeData: { id: 2 } as unknown as TableInspectorAdapter })
      );
      expect(store.getState().lens.activeData).toEqual({ id: 2 });
      expect(updaterFn).toHaveBeenCalledTimes(2);
    });
    test('state is not updating when the payload activeData is the same as in state', () => {
      store.dispatch(
        onActiveDataChange({ activeData: { id: 1 } as unknown as TableInspectorAdapter })
      );
      expect(store.getState().lens.activeData).toEqual({ id: 1 });
      expect(updaterFn).toHaveBeenCalledTimes(1);
      store.dispatch(
        onActiveDataChange({ activeData: { id: 1 } as unknown as TableInspectorAdapter })
      );
      expect(store.getState().lens.activeData).toEqual({ id: 1 });
      expect(updaterFn).toHaveBeenCalledTimes(1);
    });
    test('state is updating when the execution context changes', () => {
      expect(store.getState().lens.filters).toEqual([]);
      expect(store.getState().lens.query).toEqual({ language: 'lucene', query: '' });
      expect(store.getState().lens.searchSessionId).toEqual('');
      store.dispatch(
        setExecutionContext({
          filters: ['filter'] as unknown as Filter[],
          query: { language: 'lucene', query: 'query' },
          searchSessionId: 'searchSessionId',
        })
      );
      expect(store.getState().lens.filters).toEqual(['filter']);
      expect(store.getState().lens.query).toEqual({ language: 'lucene', query: 'query' });
      expect(store.getState().lens.searchSessionId).toEqual('searchSessionId');
    });
  });
});
