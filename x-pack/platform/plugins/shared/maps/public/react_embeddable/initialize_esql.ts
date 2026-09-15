/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { isEqual } from 'lodash';
import type { AggregateQuery } from '@kbn/es-query';
import type { LayerDescriptor } from '../../common/descriptor_types';
import { SOURCE_DATA_REQUEST_ID, SOURCE_TYPES } from '../../common/constants';
import type { ESQLSourceDescriptor } from '../../common/descriptor_types';
import type { MapStore } from '../reducers/store';
import { getLayerListRaw } from '../selectors/map_selectors';

export function initializeEsql(store: MapStore) {
  const esql$ = new BehaviorSubject<AggregateQuery[]>([]);
  const approximationApplied$ = new BehaviorSubject<boolean | undefined>(undefined);

  let prevLayerList: LayerDescriptor[] | undefined;

  function syncFromStore() {
    const layerList = getLayerListRaw(store.getState());

    if (layerList === prevLayerList) return;
    prevLayerList = layerList;

    const esqlQueries: AggregateQuery[] = [];
    let nextApproximationApplied: boolean | undefined;

    for (const layer of layerList) {
      if (layer.sourceDescriptor?.type !== SOURCE_TYPES.ESQL) continue;

      const esqlDescriptor = layer.sourceDescriptor as ESQLSourceDescriptor;
      if (esqlDescriptor.esql) {
        esqlQueries.push({ esql: esqlDescriptor.esql });
      }

      const sourceDataRequest = layer.__dataRequests?.find(
        (dr) => dr.dataId === SOURCE_DATA_REQUEST_ID
      );
      if (sourceDataRequest?.dataRequestMeta?.approximationApplied === true) {
        nextApproximationApplied = true;
      }
    }

    if (!isEqual(esql$.getValue(), esqlQueries)) {
      esql$.next(esqlQueries);
    }

    if (approximationApplied$.getValue() !== nextApproximationApplied) {
      approximationApplied$.next(nextApproximationApplied);
    }
  }

  syncFromStore();
  const unsubscribe = store.subscribe(syncFromStore);

  return {
    api: {
      esql$,
      approximationApplied$,
    },
    cleanup: unsubscribe,
  };
}
