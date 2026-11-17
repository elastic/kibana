/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';
import type { VectorProjectionEmbeddableState } from '../server/schema';
import { VECTOR_PROJECTION_DATA_VIEW_REF_NAME } from './constants';

export type StoredVectorProjectionEmbeddableState = Omit<
  VectorProjectionEmbeddableState,
  'data_view_id'
> &
  Partial<Pick<VectorProjectionEmbeddableState, 'data_view_id'>>;

export const transformIn = (
  state: VectorProjectionEmbeddableState
): { state: StoredVectorProjectionEmbeddableState; references: Reference[] } => {
  const { data_view_id: dataViewId, ...rest } = state;
  return {
    state: rest,
    references: [
      {
        type: DATA_VIEW_SAVED_OBJECT_TYPE,
        name: VECTOR_PROJECTION_DATA_VIEW_REF_NAME,
        id: dataViewId,
      },
    ],
  };
};

export const transformOut = (
  storedState: object,
  references?: Reference[]
): VectorProjectionEmbeddableState => {
  const state = storedState as StoredVectorProjectionEmbeddableState;
  const dataViewRef = references?.find(
    ({ name, type }) =>
      name === VECTOR_PROJECTION_DATA_VIEW_REF_NAME && type === DATA_VIEW_SAVED_OBJECT_TYPE
  );
  return {
    ...state,
    data_view_id: dataViewRef?.id ?? state.data_view_id ?? '',
  };
};
