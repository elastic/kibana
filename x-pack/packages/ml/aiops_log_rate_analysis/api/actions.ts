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

export const API_ACTION_NAME = {
  /** @since API v2 */
  ADD_SIGNIFICANT_ITEMS: 'add_significant_items',
  /** @since API v2 */
  ADD_SIGNIFICANT_ITEMS_HISTOGRAM: 'add_significant_items_histogram',
  /** @since API v2 */
  ADD_SIGNIFICANT_ITEMS_GROUP: 'add_significant_items_group',
  /** @since API v2 */
  ADD_SIGNIFICANT_ITEMS_GROUP_HISTOGRAM: 'add_significant_items_group_histogram',
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

interface ApiActionAddSignificantItems {
  type: typeof API_ACTION_NAME.ADD_SIGNIFICANT_ITEMS;
  payload: SignificantItem[];
}

export function addSignificantItemsAction(
  payload: ApiActionAddSignificantItems['payload']
): ApiActionAddSignificantItems {
  return {
    type: API_ACTION_NAME.ADD_SIGNIFICANT_ITEMS,
    payload,
  };
}

interface ApiActionAddSignificantItemsHistogram {
  type: typeof API_ACTION_NAME.ADD_SIGNIFICANT_ITEMS_HISTOGRAM;
  payload: SignificantItemHistogram[];
}

export function addSignificantItemsHistogramAction(
  payload: ApiActionAddSignificantItemsHistogram['payload']
): ApiActionAddSignificantItemsHistogram {
  return {
    type: API_ACTION_NAME.ADD_SIGNIFICANT_ITEMS_HISTOGRAM,
    payload,
  };
}

interface ApiActionAddSignificantItemsGroup {
  type: typeof API_ACTION_NAME.ADD_SIGNIFICANT_ITEMS_GROUP;
  payload: SignificantItemGroup[];
}

export function addSignificantItemsGroupAction(
  payload: ApiActionAddSignificantItemsGroup['payload']
): ApiActionAddSignificantItemsGroup {
  return {
    type: API_ACTION_NAME.ADD_SIGNIFICANT_ITEMS_GROUP,
    payload,
  };
}

interface ApiActionAddSignificantItemsGroupHistogram {
  type: typeof API_ACTION_NAME.ADD_SIGNIFICANT_ITEMS_GROUP_HISTOGRAM;
  payload: SignificantItemGroupHistogram[];
}

export function addSignificantItemsGroupHistogramAction(
  payload: ApiActionAddSignificantItemsGroupHistogram['payload']
): ApiActionAddSignificantItemsGroupHistogram {
  return {
    type: API_ACTION_NAME.ADD_SIGNIFICANT_ITEMS_GROUP_HISTOGRAM,
    payload,
  };
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

export type AiopsLogRateAnalysisApiAction =
  | ApiActionAddSignificantItems
  | ApiActionAddSignificantItemsGroup
  | ApiActionAddSignificantItemsHistogram
  | ApiActionAddSignificantItemsGroupHistogram
  | ApiActionAddError
  | ApiActionPing
  | ApiActionResetAll
  | ApiActionResetErrors
  | ApiActionResetGroups
  | ApiActionUpdateLoadingState
  | ApiActionSetZeroDocsFallback;
