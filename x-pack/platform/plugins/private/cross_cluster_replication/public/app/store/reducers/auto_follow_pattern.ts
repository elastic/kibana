/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AutoFollowPattern } from '../../../../common/types';
import * as t from '../action_types';
import { arrayToObject } from '../../services/utils';
import { getPrefixSuffixFromFollowPattern } from '../../services/auto_follow_pattern';
import type {
  DeleteAutoFollowPatternResponse,
  PauseAutoFollowPatternResponse,
  ResumeAutoFollowPatternResponse,
} from '../../services/api';

export interface ParsedAutoFollowPattern extends AutoFollowPattern {
  followIndexPatternPrefix?: string;
  followIndexPatternSuffix?: string;
}

export interface AutoFollowPatternState {
  byId: Record<string, ParsedAutoFollowPattern>;
  selectedDetailId: string | null;
  selectedEditId: string | null;
}

const initialState: AutoFollowPatternState = {
  byId: {},
  selectedDetailId: null,
  selectedEditId: null,
};

const AUTO_FOLLOW_PATTERN_LOAD_SUCCESS: `${typeof t.AUTO_FOLLOW_PATTERN_LOAD}_SUCCESS` = `${t.AUTO_FOLLOW_PATTERN_LOAD}_SUCCESS`;
const AUTO_FOLLOW_PATTERN_GET_SUCCESS: `${typeof t.AUTO_FOLLOW_PATTERN_GET}_SUCCESS` = `${t.AUTO_FOLLOW_PATTERN_GET}_SUCCESS`;
const AUTO_FOLLOW_PATTERN_DELETE_SUCCESS: `${typeof t.AUTO_FOLLOW_PATTERN_DELETE}_SUCCESS` = `${t.AUTO_FOLLOW_PATTERN_DELETE}_SUCCESS`;
const AUTO_FOLLOW_PATTERN_PAUSE_SUCCESS: `${typeof t.AUTO_FOLLOW_PATTERN_PAUSE}_SUCCESS` = `${t.AUTO_FOLLOW_PATTERN_PAUSE}_SUCCESS`;
const AUTO_FOLLOW_PATTERN_RESUME_SUCCESS: `${typeof t.AUTO_FOLLOW_PATTERN_RESUME}_SUCCESS` = `${t.AUTO_FOLLOW_PATTERN_RESUME}_SUCCESS`;

interface LoadAutoFollowPatternsSuccessAction {
  type: typeof AUTO_FOLLOW_PATTERN_LOAD_SUCCESS;
  payload: { patterns: AutoFollowPattern[] };
}

interface GetAutoFollowPatternSuccessAction {
  type: typeof AUTO_FOLLOW_PATTERN_GET_SUCCESS;
  payload: AutoFollowPattern;
}

interface SelectAutoFollowPatternDetailAction {
  type: typeof t.AUTO_FOLLOW_PATTERN_SELECT_DETAIL;
  payload: string | null;
}

interface SelectAutoFollowPatternEditAction {
  type: typeof t.AUTO_FOLLOW_PATTERN_SELECT_EDIT;
  payload: string | null;
}

interface DeleteAutoFollowPatternSuccessAction {
  type: typeof AUTO_FOLLOW_PATTERN_DELETE_SUCCESS;
  payload: DeleteAutoFollowPatternResponse;
}

interface PauseAutoFollowPatternSuccessAction {
  type: typeof AUTO_FOLLOW_PATTERN_PAUSE_SUCCESS;
  payload: PauseAutoFollowPatternResponse;
}

interface ResumeAutoFollowPatternSuccessAction {
  type: typeof AUTO_FOLLOW_PATTERN_RESUME_SUCCESS;
  payload: ResumeAutoFollowPatternResponse;
}

export type AutoFollowPatternReducerAction =
  | LoadAutoFollowPatternsSuccessAction
  | GetAutoFollowPatternSuccessAction
  | SelectAutoFollowPatternDetailAction
  | SelectAutoFollowPatternEditAction
  | DeleteAutoFollowPatternSuccessAction
  | PauseAutoFollowPatternSuccessAction
  | ResumeAutoFollowPatternSuccessAction;

const setActiveForIds = (
  ids: string[],
  byId: Record<string, ParsedAutoFollowPattern>,
  active: boolean
): Record<string, ParsedAutoFollowPattern> => {
  const shallowCopyByIds = { ...byId };
  ids.forEach((id) => {
    const pattern = byId[id];
    if (!pattern) {
      return;
    }
    shallowCopyByIds[id] = { ...pattern, active };
  });
  return shallowCopyByIds;
};

const parseAutoFollowPattern = (autoFollowPattern: AutoFollowPattern): ParsedAutoFollowPattern => {
  // Extract prefix and suffix from follow index pattern
  const { followIndexPatternPrefix, followIndexPatternSuffix } = getPrefixSuffixFromFollowPattern(
    autoFollowPattern.followIndexPattern
  );

  return { ...autoFollowPattern, followIndexPatternPrefix, followIndexPatternSuffix };
};

export const reducer = (
  state: AutoFollowPatternState = initialState,
  action: AutoFollowPatternReducerAction
): AutoFollowPatternState => {
  switch (action.type) {
    case AUTO_FOLLOW_PATTERN_LOAD_SUCCESS: {
      const payload = action.payload;
      return {
        ...state,
        byId: arrayToObject(payload.patterns.map(parseAutoFollowPattern), 'name'),
      };
    }
    case AUTO_FOLLOW_PATTERN_GET_SUCCESS: {
      const payload = action.payload;
      return {
        ...state,
        byId: { ...state.byId, [payload.name]: parseAutoFollowPattern(payload) },
      };
    }
    case t.AUTO_FOLLOW_PATTERN_SELECT_DETAIL: {
      return { ...state, selectedDetailId: action.payload };
    }
    case t.AUTO_FOLLOW_PATTERN_SELECT_EDIT: {
      return { ...state, selectedEditId: action.payload };
    }
    case AUTO_FOLLOW_PATTERN_DELETE_SUCCESS: {
      const payload = action.payload;
      const byId = { ...state.byId };
      payload.itemsDeleted.forEach((id) => delete byId[id]);
      return { ...state, byId };
    }
    case AUTO_FOLLOW_PATTERN_PAUSE_SUCCESS: {
      const payload = action.payload;
      return { ...state, byId: setActiveForIds(payload.itemsPaused, state.byId, false) };
    }
    case AUTO_FOLLOW_PATTERN_RESUME_SUCCESS: {
      const payload = action.payload;
      return { ...state, byId: setActiveForIds(payload.itemsResumed, state.byId, true) };
    }
    default:
      return state;
  }
};
