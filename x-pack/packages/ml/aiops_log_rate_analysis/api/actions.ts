/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SignificantItem,
  SignificantItemHistogram,
  SignificantItemGroup,
  SignificantItemGroupHistogram,
} from '@kbn/ml-agg-utils';

import type { AiopsLogRateAnalysisApiVersion as ApiVersion } from './schema';

export const API_ACTION_NAME = {
  /** @since API v2 */
  ADD_SIGNIFICANT_ITEMS: 'add_significant_items',
  /** @since API v2 */
  ADD_SIGNIFICANT_ITEMS_HISTOGRAM: 'add_significant_items_histogram',
  /** @since API v2 */
  ADD_SIGNIFICANT_ITEMS_GROUP: 'add_significant_items_group',
  /** @since API v2 */
  ADD_SIGNIFICANT_ITEMS_GROUP_HISTOGRAM: 'add_significant_items_group_histogram',
  /** @deprecated since API v2 */
  ADD_SIGNIFICANT_TERMS: 'add_significant_terms',
  /** @deprecated since API v2 */
  ADD_SIGNIFICANT_TERMS_HISTOGRAM: 'add_significant_terms_histogram',
  /** @deprecated since API v2 */
  ADD_SIGNIFICANT_TERMS_GROUP: 'add_significant_terms_group',
  /** @deprecated since API v2 */
  ADD_SIGNIFICANT_TERMS_GROUP_HISTOGRAM: 'add_significant_terms_group_histogram',
  ADD_ERROR: 'add_error',
  PING: 'ping',
  RESET_ALL: 'reset_all',
  RESET_ERRORS: 'reset_errors',
  RESET_GROUPS: 'reset_groups',
  SET_ZERO_DOCS_FALLBACK: 'set_zero_docs_fallback',
  UPDATE_LOADING_STATE: 'update_loading_state',
} as const;
export type ApiActionName = typeof API_ACTION_NAME[keyof typeof API_ACTION_NAME];

interface ApiActionAddSignificantItems<T extends ApiVersion> {
  type: T extends '1'
    ? typeof API_ACTION_NAME.ADD_SIGNIFICANT_TERMS
    : T extends '2'
    ? typeof API_ACTION_NAME.ADD_SIGNIFICANT_ITEMS
    : never;
  payload: SignificantItem[];
}

export function addSignificantItemsAction<T extends ApiVersion>(
  payload: ApiActionAddSignificantItems<T>['payload'],
  version: T
): ApiActionAddSignificantItems<T> {
  if (version === '1') {
    return {
      type: API_ACTION_NAME.ADD_SIGNIFICANT_TERMS,
      payload,
    } as ApiActionAddSignificantItems<T>;
  }

  return {
    type: API_ACTION_NAME.ADD_SIGNIFICANT_ITEMS,
    payload,
  } as ApiActionAddSignificantItems<T>;
}

interface ApiActionAddSignificantItemsHistogram<T extends ApiVersion> {
  type: T extends '1'
    ? typeof API_ACTION_NAME.ADD_SIGNIFICANT_TERMS_HISTOGRAM
    : T extends '2'
    ? typeof API_ACTION_NAME.ADD_SIGNIFICANT_ITEMS_HISTOGRAM
    : never;
  payload: SignificantItemHistogram[];
}

export function addSignificantItemsHistogramAction<T extends ApiVersion>(
  payload: ApiActionAddSignificantItemsHistogram<T>['payload'],
  version: T
): ApiActionAddSignificantItemsHistogram<T> {
  if (version === '1') {
    return {
      type: API_ACTION_NAME.ADD_SIGNIFICANT_TERMS_HISTOGRAM,
      payload,
    } as ApiActionAddSignificantItemsHistogram<T>;
  }

  return {
    type: API_ACTION_NAME.ADD_SIGNIFICANT_ITEMS_HISTOGRAM,
    payload,
  } as ApiActionAddSignificantItemsHistogram<T>;
}

interface ApiActionAddSignificantItemsGroup<T extends ApiVersion> {
  type: T extends '1'
    ? typeof API_ACTION_NAME.ADD_SIGNIFICANT_TERMS_GROUP
    : T extends '2'
    ? typeof API_ACTION_NAME.ADD_SIGNIFICANT_ITEMS_GROUP
    : never;
  payload: SignificantItemGroup[];
}

export function addSignificantItemsGroupAction<T extends ApiVersion>(
  payload: ApiActionAddSignificantItemsGroup<T>['payload'],
  version: T
): ApiActionAddSignificantItemsGroup<T> {
  if (version === '1') {
    return {
      type: API_ACTION_NAME.ADD_SIGNIFICANT_TERMS_GROUP,
      payload,
    } as ApiActionAddSignificantItemsGroup<T>;
  }

  return {
    type: API_ACTION_NAME.ADD_SIGNIFICANT_ITEMS_GROUP,
    payload,
  } as ApiActionAddSignificantItemsGroup<T>;
}

interface ApiActionAddSignificantItemsGroupHistogram<T extends ApiVersion> {
  type: T extends '1'
    ? typeof API_ACTION_NAME.ADD_SIGNIFICANT_TERMS_GROUP_HISTOGRAM
    : T extends '2'
    ? typeof API_ACTION_NAME.ADD_SIGNIFICANT_ITEMS_GROUP_HISTOGRAM
    : never;
  payload: SignificantItemGroupHistogram[];
}

export function addSignificantItemsGroupHistogramAction<T extends ApiVersion>(
  payload: ApiActionAddSignificantItemsGroupHistogram<T>['payload'],
  version: T
): ApiActionAddSignificantItemsGroupHistogram<T> {
  if (version === '1') {
    return {
      type: API_ACTION_NAME.ADD_SIGNIFICANT_TERMS_GROUP_HISTOGRAM,
      payload,
    } as ApiActionAddSignificantItemsGroupHistogram<T>;
  }

  return {
    type: API_ACTION_NAME.ADD_SIGNIFICANT_ITEMS_GROUP_HISTOGRAM,
    payload,
  } as ApiActionAddSignificantItemsGroupHistogram<T>;
}

interface ApiActionAddError {
  type: typeof API_ACTION_NAME.ADD_ERROR;
  payload: string;
}

export function addErrorAction(payload: ApiActionAddError['payload']): ApiActionAddError {
  return {
    type: API_ACTION_NAME.ADD_ERROR,
    payload,
  };
}

interface ApiActionResetErrors {
  type: typeof API_ACTION_NAME.RESET_ERRORS;
}

export function resetErrorsAction() {
  return {
    type: API_ACTION_NAME.RESET_ERRORS,
  };
}

interface ApiActionPing {
  type: typeof API_ACTION_NAME.PING;
}

export function pingAction(): ApiActionPing {
  return { type: API_ACTION_NAME.PING };
}

interface ApiActionResetAll {
  type: typeof API_ACTION_NAME.RESET_ALL;
}

export function resetAllAction(): ApiActionResetAll {
  return { type: API_ACTION_NAME.RESET_ALL };
}

interface ApiActionResetGroups {
  type: typeof API_ACTION_NAME.RESET_GROUPS;
}

export function resetGroupsAction(): ApiActionResetGroups {
  return { type: API_ACTION_NAME.RESET_GROUPS };
}

interface ApiActionUpdateLoadingState {
  type: typeof API_ACTION_NAME.UPDATE_LOADING_STATE;
  payload: {
    ccsWarning: boolean;
    loaded: number;
    loadingState: string;
    remainingFieldCandidates?: string[];
    groupsMissing?: boolean;
  };
}

export function updateLoadingStateAction(
  payload: ApiActionUpdateLoadingState['payload']
): ApiActionUpdateLoadingState {
  return {
    type: API_ACTION_NAME.UPDATE_LOADING_STATE,
    payload,
  };
}

interface ApiActionSetZeroDocsFallback {
  type: typeof API_ACTION_NAME.SET_ZERO_DOCS_FALLBACK;
  payload: boolean;
}

export function setZeroDocsFallback(
  payload: ApiActionSetZeroDocsFallback['payload']
): ApiActionSetZeroDocsFallback {
  return {
    type: API_ACTION_NAME.SET_ZERO_DOCS_FALLBACK,
    payload,
  };
}

export type AiopsLogRateAnalysisApiAction<T extends ApiVersion> =
  | ApiActionAddSignificantItems<T>
  | ApiActionAddSignificantItemsGroup<T>
  | ApiActionAddSignificantItemsHistogram<T>
  | ApiActionAddSignificantItemsGroupHistogram<T>
  | ApiActionAddError
  | ApiActionPing
  | ApiActionResetAll
  | ApiActionResetErrors
  | ApiActionResetGroups
  | ApiActionUpdateLoadingState
  | ApiActionSetZeroDocsFallback;
