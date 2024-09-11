/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useReducer, useCallback } from 'react';
import { OnCheckCompleted } from '../../types';
import { MappingsError } from '../../utils/fetch_mappings';
import { UnallowedValuesError } from '../../utils/fetch_unallowed_values';
import { checkIndex as _checkIndex, CheckIndexProps } from '../../utils/check_index';
import { initialState, reducer } from './reducer';
import { UseIndicesCheckReturnValue } from './types';
import { useIsMounted } from '../use_is_mounted';

export const useIndicesCheck = ({
  onCheckCompleted,
}: {
  onCheckCompleted: OnCheckCompleted;
}): UseIndicesCheckReturnValue => {
  const { isMountedRef } = useIsMounted();
  const [state, dispatch] = useReducer(reducer, initialState);

  const checkIndex = useCallback(
    ({
      abortController,
      formatBytes,
      formatNumber,
      httpFetch,
      indexName,
      pattern,
      batchId,
      checkAllStartTime,
      isCheckAll,
      isLastCheck,
    }: Omit<CheckIndexProps, 'onCheckCompleted'>) => {
      _checkIndex({
        batchId,
        abortController,
        formatBytes,
        formatNumber,
        httpFetch,
        indexName,
        onCheckCompleted,
        pattern,
        checkAllStartTime,
        isCheckAll,
        isLastCheck,
        onStart: () => {
          if (!isMountedRef.current) return;
          dispatch({ type: 'START', data: { indexName } });
        },
        onLoadMappingsStart: () => {
          if (!isMountedRef.current) return;
          dispatch({ type: 'LOAD_MAPPINGS_START', data: { indexName } });
        },
        onLoadUnallowedValuesStart: () => {
          if (!isMountedRef.current) return;
          dispatch({ type: 'LOAD_UNALLOWED_VALUES_START', data: { indexName } });
        },
        onSuccess: ({ partitionedFieldMetadata, mappingsProperties, unallowedValues }) => {
          if (!isMountedRef.current) return;
          dispatch({
            type: 'SUCCESS',
            data: {
              indexName,
              partitionedFieldMetadata,
              mappingsProperties,
              unallowedValues,
            },
          });
        },
        onLoadMappingsSuccess: (indexes) => {
          if (!isMountedRef.current) return;
          dispatch({ type: 'LOAD_MAPPINGS_SUCCESS', data: { indexName, indexes } });
        },
        onLoadUnallowedValuesSuccess: (searchResults) => {
          if (!isMountedRef.current) return;
          dispatch({ type: 'LOAD_UNALLOWED_VALUES_SUCCESS', data: { indexName, searchResults } });
        },
        onError: (error) => {
          if (!isMountedRef.current) return;
          if (error instanceof MappingsError) {
            dispatch({ type: 'LOAD_MAPPINGS_ERROR', data: { indexName, error } });
          } else if (error instanceof UnallowedValuesError) {
            dispatch({ type: 'LOAD_UNALLOWED_VALUES_ERROR', data: { indexName, error } });
          } else {
            if (error instanceof Error) {
              dispatch({ type: 'GENERIC_ERROR', data: { indexName, error } });
            } else {
              dispatch({ type: 'GENERIC_ERROR', data: { indexName, error: 'Unknown error' } });
            }
          }
        },
      });
    },
    [isMountedRef, onCheckCompleted]
  );

  return {
    ...state,
    checkIndex,
  };
};
