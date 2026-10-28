/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Middleware } from '@reduxjs/toolkit';
import type { LensState } from '@kbn/lens-common';
import { isEqual } from 'lodash';
import { onActiveDataChange, updateDatasourceState, setExecutionContext } from '.';
import type { SetExecutionContextPayload } from './lens_slice';

/** cancels updates to the store that don't change the state */
export const optimizingMiddleware = (): Middleware<{}, LensState> => (store) => {
  return (next) => (action) => {
    if (onActiveDataChange.match(action)) {
      if (isEqual(store.getState().lens.activeData, action.payload.activeData)) {
        return;
      }
    } else if (updateDatasourceState.match(action)) {
      const { datasourceId, newDatasourceState } = action.payload;
      const { datasourceStates } = store.getState().lens;
      if (isEqual(datasourceStates[datasourceId].state, newDatasourceState)) {
        return;
      }
    } else if (setExecutionContext.match(action)) {
      const payloadKeys = Object.keys(action.payload) as Array<keyof SetExecutionContextPayload>;
      const prevState = store.getState().lens;
      const stateSliceToUpdate = payloadKeys.reduce<SetExecutionContextPayload>(
        (acc, currentKey) => {
          return {
            ...acc,
            [currentKey]: prevState[currentKey],
          };
        },
        {}
      );

      if (isEqual(action.payload, stateSliceToUpdate)) {
        return;
      }
    }

    next(action);
  };
};
