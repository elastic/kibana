/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { skip } from 'rxjs';
import { createMapStore } from '../reducers/store';
import { initializeEsql } from './initialize_esql';
import { addLayerWithoutDataSync, updateLayerDescriptor } from '../actions/layer_actions';
import { SOURCE_DATA_REQUEST_ID, SOURCE_TYPES } from '../../common/constants';
import type { LayerDescriptor } from '../../common/descriptor_types';

jest.mock('../kibana_services', () => {
  return {
    getIsDarkMode() {
      return false;
    },
    getMapsCapabilities() {
      return { save: true };
    },
    getShowMapsInspectorAdapter() {
      return false;
    },
    getEMSSettings() {
      return {
        isEMSUrlSet() {
          return false;
        },
      };
    },
    getTimeFilter() {
      return {
        getTime() {
          return { from: 'now-15m', to: 'now' };
        },
      };
    },
  };
});

function createEsqlLayerDescriptor(
  id: string,
  esql: string,
  approximationApplied?: boolean
): LayerDescriptor {
  return {
    id,
    sourceDescriptor: {
      type: SOURCE_TYPES.ESQL,
      esql,
    },
    __dataRequests:
      approximationApplied !== undefined
        ? [
            {
              dataId: SOURCE_DATA_REQUEST_ID,
              dataRequestMeta: { approximationApplied },
            },
          ]
        : [],
  } as unknown as LayerDescriptor;
}

function createNonEsqlLayerDescriptor(id: string): LayerDescriptor {
  return {
    id,
    sourceDescriptor: {
      type: SOURCE_TYPES.ES_SEARCH,
      indexPatternId: 'some-index',
    },
  } as unknown as LayerDescriptor;
}

describe('initializeEsql', () => {
  describe('esql$', () => {
    test('should emit empty array when there are no ESQL layers', () => {
      const store = createMapStore();
      const { api } = initializeEsql(store);
      expect(api.esql$.getValue()).toEqual([]);
    });

    test('should emit ESQL queries when store already has ESQL layers at initialization', () => {
      const store = createMapStore();
      store.dispatch(addLayerWithoutDataSync(createEsqlLayerDescriptor('layer1', 'FROM logs*')));
      const { api } = initializeEsql(store);
      expect(api.esql$.getValue()).toEqual([{ esql: 'FROM logs*' }]);
    });

    test('should emit updated queries when ESQL layer is added to store', () => {
      const store = createMapStore();
      const { api } = initializeEsql(store);
      const onEmitMock = jest.fn();
      const subscription = api.esql$.pipe(skip(1)).subscribe(onEmitMock);

      store.dispatch(addLayerWithoutDataSync(createEsqlLayerDescriptor('layer1', 'FROM logs*')));

      expect(onEmitMock).toHaveBeenCalledTimes(1);
      expect(onEmitMock).toHaveBeenCalledWith([{ esql: 'FROM logs*' }]);

      subscription.unsubscribe();
    });

    test('should emit empty array when ESQL layer is removed', () => {
      const store = createMapStore();
      store.dispatch(addLayerWithoutDataSync(createEsqlLayerDescriptor('layer1', 'FROM logs*')));
      const { api } = initializeEsql(store);
      const onEmitMock = jest.fn();
      const subscription = api.esql$.pipe(skip(1)).subscribe(onEmitMock);

      store.dispatch({ type: 'REMOVE_LAYER', id: 'layer1' } as any);

      expect(onEmitMock).toHaveBeenCalledTimes(1);
      expect(onEmitMock).toHaveBeenCalledWith([]);

      subscription.unsubscribe();
    });

    test('should emit queries for multiple ESQL layers', () => {
      const store = createMapStore();
      const { api } = initializeEsql(store);
      const onEmitMock = jest.fn();
      const subscription = api.esql$.pipe(skip(1)).subscribe(onEmitMock);

      store.dispatch(addLayerWithoutDataSync(createEsqlLayerDescriptor('layer1', 'FROM logs*')));
      store.dispatch(addLayerWithoutDataSync(createEsqlLayerDescriptor('layer2', 'FROM metrics*')));

      expect(onEmitMock).toHaveBeenLastCalledWith([
        { esql: 'FROM logs*' },
        { esql: 'FROM metrics*' },
      ]);

      subscription.unsubscribe();
    });

    test('should not emit when ESQL query is updated to the same value', () => {
      const store = createMapStore();
      store.dispatch(addLayerWithoutDataSync(createEsqlLayerDescriptor('layer1', 'FROM logs*')));
      const { api } = initializeEsql(store);
      const onEmitMock = jest.fn();
      const subscription = api.esql$.pipe(skip(1)).subscribe(onEmitMock);

      store.dispatch(updateLayerDescriptor(createEsqlLayerDescriptor('layer1', 'FROM logs*')));

      expect(onEmitMock).not.toHaveBeenCalled();

      subscription.unsubscribe();
    });

    test('should emit when ESQL query changes', () => {
      const store = createMapStore();
      store.dispatch(addLayerWithoutDataSync(createEsqlLayerDescriptor('layer1', 'FROM logs*')));
      const { api } = initializeEsql(store);
      const onEmitMock = jest.fn();
      const subscription = api.esql$.pipe(skip(1)).subscribe(onEmitMock);

      store.dispatch(
        updateLayerDescriptor(createEsqlLayerDescriptor('layer1', 'FROM logs* | LIMIT 100'))
      );

      expect(onEmitMock).toHaveBeenCalledTimes(1);
      expect(onEmitMock).toHaveBeenCalledWith([{ esql: 'FROM logs* | LIMIT 100' }]);

      subscription.unsubscribe();
    });

    test('should not include queries from non-ESQL layers', () => {
      const store = createMapStore();
      const { api } = initializeEsql(store);
      const onEmitMock = jest.fn();
      const subscription = api.esql$.pipe(skip(1)).subscribe(onEmitMock);

      store.dispatch(addLayerWithoutDataSync(createNonEsqlLayerDescriptor('layer2')));
      store.dispatch(addLayerWithoutDataSync(createEsqlLayerDescriptor('layer1', 'FROM logs*')));

      expect(onEmitMock).toHaveBeenLastCalledWith([{ esql: 'FROM logs*' }]);

      subscription.unsubscribe();
    });
  });

  describe('approximationApplied$', () => {
    test('should initialize to undefined when there are no ESQL layers', () => {
      const store = createMapStore();
      const { api } = initializeEsql(store);
      expect(api.approximationApplied$.getValue()).toBeUndefined();
    });

    test('should initialize to undefined when ESQL layer has no data requests with approximationApplied', () => {
      const store = createMapStore();
      store.dispatch(addLayerWithoutDataSync(createEsqlLayerDescriptor('layer1', 'FROM logs*')));
      const { api } = initializeEsql(store);
      expect(api.approximationApplied$.getValue()).toBeUndefined();
    });

    test('should initialize to true when ESQL layer has approximationApplied set to true', () => {
      const store = createMapStore();
      store.dispatch(
        addLayerWithoutDataSync(createEsqlLayerDescriptor('layer1', 'FROM logs*', true))
      );
      const { api } = initializeEsql(store);
      expect(api.approximationApplied$.getValue()).toBe(true);
    });

    test('should emit true when approximationApplied is set on source data request', () => {
      const store = createMapStore();
      store.dispatch(addLayerWithoutDataSync(createEsqlLayerDescriptor('layer1', 'FROM logs*')));
      const { api } = initializeEsql(store);
      const onEmitMock = jest.fn();
      const subscription = api.approximationApplied$.pipe(skip(1)).subscribe(onEmitMock);

      store.dispatch(
        updateLayerDescriptor(createEsqlLayerDescriptor('layer1', 'FROM logs*', true))
      );

      expect(onEmitMock).toHaveBeenCalledTimes(1);
      expect(onEmitMock).toHaveBeenCalledWith(true);

      subscription.unsubscribe();
    });

    test('should emit undefined when approximationApplied is removed', () => {
      const store = createMapStore();
      store.dispatch(
        addLayerWithoutDataSync(createEsqlLayerDescriptor('layer1', 'FROM logs*', true))
      );
      const { api } = initializeEsql(store);
      const onEmitMock = jest.fn();
      const subscription = api.approximationApplied$.pipe(skip(1)).subscribe(onEmitMock);

      store.dispatch(updateLayerDescriptor(createEsqlLayerDescriptor('layer1', 'FROM logs*')));

      expect(onEmitMock).toHaveBeenCalledTimes(1);
      expect(onEmitMock).toHaveBeenCalledWith(undefined);

      subscription.unsubscribe();
    });

    test('should not emit when approximationApplied value does not change', () => {
      const store = createMapStore();
      store.dispatch(
        addLayerWithoutDataSync(createEsqlLayerDescriptor('layer1', 'FROM logs*', true))
      );
      const { api } = initializeEsql(store);
      const onEmitMock = jest.fn();
      const subscription = api.approximationApplied$.pipe(skip(1)).subscribe(onEmitMock);

      store.dispatch(
        updateLayerDescriptor(createEsqlLayerDescriptor('layer1', 'FROM logs*', true))
      );

      expect(onEmitMock).not.toHaveBeenCalled();

      subscription.unsubscribe();
    });
  });

  describe('cleanup', () => {
    test('should stop syncing from store after cleanup', () => {
      const store = createMapStore();
      const { api, cleanup } = initializeEsql(store);
      const onEmitMock = jest.fn();
      const subscription = api.esql$.pipe(skip(1)).subscribe(onEmitMock);

      cleanup();

      store.dispatch(addLayerWithoutDataSync(createEsqlLayerDescriptor('layer1', 'FROM logs*')));

      expect(onEmitMock).not.toHaveBeenCalled();

      subscription.unsubscribe();
    });
  });
});
