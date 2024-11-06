/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IndicesGetMappingIndexMappingRecord,
  MappingProperty,
} from '@elastic/elasticsearch/lib/api/types';

import {
  PartitionedFieldMetadata,
  UnallowedValueCount,
  UnallowedValueSearchResult,
} from '../../types';
import { MappingsError } from '../../utils/fetch_mappings';
import { UnallowedValuesError } from '../../utils/fetch_unallowed_values';
import { UseIndicesCheckState } from './types';

type Action = { data: { indexName: string } } & (
  | {
      type: 'START' | 'LOAD_MAPPINGS_START' | 'LOAD_UNALLOWED_VALUES_START';
    }
  | {
      type: 'SUCCESS';
      data: {
        partitionedFieldMetadata: PartitionedFieldMetadata;
        mappingsProperties: Record<string, MappingProperty> | null;
        unallowedValues: Record<string, UnallowedValueCount[]>;
      };
    }
  | {
      type: 'LOAD_MAPPINGS_SUCCESS';
      data: { indexes: Record<string, IndicesGetMappingIndexMappingRecord> };
    }
  | {
      type: 'LOAD_UNALLOWED_VALUES_SUCCESS';
      data: { searchResults: UnallowedValueSearchResult[] };
    }
  | { type: 'GENERIC_ERROR'; data: { error: string | Error } }
  | { type: 'LOAD_MAPPINGS_ERROR'; data: { error: MappingsError } }
  | { type: 'LOAD_UNALLOWED_VALUES_ERROR'; data: { error: UnallowedValuesError } }
);

// intentionally returning a new object every time
// instead of caching the initial state
// to avoid potential mutations when spreaded
// across actions
export const getInitialCheckStateValue = () => ({
  isChecking: false,
  isLoadingMappings: false,
  isLoadingUnallowedValues: false,
  indexes: null,
  partitionedFieldMetadata: null,
  searchResults: null,
  unallowedValues: null,
  mappingsProperties: null,
  genericError: null,
  mappingsError: null,
  unallowedValuesError: null,
  isCheckComplete: false,
});

export const initialState: UseIndicesCheckState = {
  checkState: {},
};

export const reducer = (state: UseIndicesCheckState, action: Action): UseIndicesCheckState => {
  switch (action.type) {
    case 'START':
      return {
        ...state,
        checkState: {
          ...state.checkState,
          [action.data.indexName]: {
            ...getInitialCheckStateValue(),
            isChecking: true,
          },
        },
      };
    case 'LOAD_MAPPINGS_START':
      return {
        ...state,
        checkState: {
          ...state.checkState,
          [action.data.indexName]: {
            ...state.checkState[action.data.indexName],
            isChecking: true,
            isLoadingMappings: true,
          },
        },
      };
    case 'LOAD_UNALLOWED_VALUES_START':
      return {
        ...state,
        checkState: {
          ...state.checkState,
          [action.data.indexName]: {
            ...state.checkState[action.data.indexName],
            isChecking: true,
            isLoadingUnallowedValues: true,
          },
        },
      };
    case 'SUCCESS':
      return {
        ...state,
        checkState: {
          ...state.checkState,
          [action.data.indexName]: {
            ...state.checkState[action.data.indexName],
            isChecking: false,
            isLoadingMappings: false,
            isLoadingUnallowedValues: false,
            genericError: null,
            mappingsError: null,
            unallowedValuesError: null,
            partitionedFieldMetadata: action.data.partitionedFieldMetadata,
            unallowedValues: action.data.unallowedValues,
            mappingsProperties: action.data.mappingsProperties,
            isCheckComplete: true,
          },
        },
      };
    case 'LOAD_MAPPINGS_SUCCESS':
      return {
        ...state,
        checkState: {
          ...state.checkState,
          [action.data.indexName]: {
            ...state.checkState[action.data.indexName],
            isChecking: false,
            isLoadingMappings: false,
            isLoadingUnallowedValues: false,
            genericError: null,
            mappingsError: null,
            indexes: action.data.indexes,
          },
        },
      };
    case 'LOAD_UNALLOWED_VALUES_SUCCESS':
      return {
        ...state,
        checkState: {
          ...state.checkState,
          [action.data.indexName]: {
            ...state.checkState[action.data.indexName],
            isChecking: false,
            isLoadingUnallowedValues: false,
            genericError: null,
            unallowedValuesError: null,
            searchResults: action.data.searchResults,
          },
        },
      };
    case 'GENERIC_ERROR':
      return {
        ...state,
        checkState: {
          ...state.checkState,
          [action.data.indexName]: {
            ...getInitialCheckStateValue(),
            genericError: action.data.error,
          },
        },
      };
    case 'LOAD_MAPPINGS_ERROR':
      return {
        ...state,
        checkState: {
          ...state.checkState,
          [action.data.indexName]: {
            ...getInitialCheckStateValue(),
            mappingsError: action.data.error,
          },
        },
      };
    case 'LOAD_UNALLOWED_VALUES_ERROR':
      return {
        ...state,
        checkState: {
          ...state.checkState,
          [action.data.indexName]: {
            ...getInitialCheckStateValue(),
            unallowedValuesError: action.data.error,
          },
        },
      };
    default:
      throw new Error('Invalid action type');
  }
};
