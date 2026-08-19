/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FollowerIndex, FollowerIndexWithPausedStatus } from '../../../../common/types';
import * as t from '../action_types';
import { arrayToObject } from '../../services/utils';
import type { UnfollowLeaderIndexResponse } from '../../services/api';

export interface FollowerIndexState {
  byId: Record<string, FollowerIndexWithPausedStatus>;
  selectedDetailId: string | null;
  selectedEditId: string | null;
}

const initialState: FollowerIndexState = {
  byId: {},
  selectedDetailId: null,
  selectedEditId: null,
};

const FOLLOWER_INDEX_LOAD_SUCCESS: `${typeof t.FOLLOWER_INDEX_LOAD}_SUCCESS` = `${t.FOLLOWER_INDEX_LOAD}_SUCCESS`;
const FOLLOWER_INDEX_GET_SUCCESS: `${typeof t.FOLLOWER_INDEX_GET}_SUCCESS` = `${t.FOLLOWER_INDEX_GET}_SUCCESS`;
const FOLLOWER_INDEX_UNFOLLOW_SUCCESS: `${typeof t.FOLLOWER_INDEX_UNFOLLOW}_SUCCESS` = `${t.FOLLOWER_INDEX_UNFOLLOW}_SUCCESS`;

interface LoadFollowerIndicesSuccessAction {
  type: typeof FOLLOWER_INDEX_LOAD_SUCCESS;
  payload: { indices: FollowerIndex[] };
}

interface GetFollowerIndexSuccessAction {
  type: typeof FOLLOWER_INDEX_GET_SUCCESS;
  payload: FollowerIndex;
}

interface SelectFollowerIndexDetailAction {
  type: typeof t.FOLLOWER_INDEX_SELECT_DETAIL;
  payload: string | null;
}

interface SelectFollowerIndexEditAction {
  type: typeof t.FOLLOWER_INDEX_SELECT_EDIT;
  payload: string | null;
}

interface UnfollowLeaderIndexSuccessAction {
  type: typeof FOLLOWER_INDEX_UNFOLLOW_SUCCESS;
  payload: UnfollowLeaderIndexResponse;
}

export type FollowerIndexReducerAction =
  | LoadFollowerIndicesSuccessAction
  | GetFollowerIndexSuccessAction
  | SelectFollowerIndexDetailAction
  | SelectFollowerIndexEditAction
  | UnfollowLeaderIndexSuccessAction;

const parseFollowerIndex = (followerIndex: FollowerIndex): FollowerIndexWithPausedStatus => {
  // Extract status into boolean
  return { ...followerIndex, isPaused: followerIndex.status === 'paused' };
};

export const reducer = (
  state: FollowerIndexState = initialState,
  action: FollowerIndexReducerAction
): FollowerIndexState => {
  switch (action.type) {
    case FOLLOWER_INDEX_LOAD_SUCCESS: {
      const payload = action.payload;
      return {
        ...state,
        byId: arrayToObject(payload.indices.map(parseFollowerIndex), 'name'),
      };
    }
    case FOLLOWER_INDEX_GET_SUCCESS: {
      const payload = action.payload;
      return {
        ...state,
        byId: { ...state.byId, [payload.name]: parseFollowerIndex(payload) },
      };
    }
    case t.FOLLOWER_INDEX_SELECT_DETAIL: {
      return { ...state, selectedDetailId: action.payload };
    }
    case t.FOLLOWER_INDEX_SELECT_EDIT: {
      return { ...state, selectedEditId: action.payload };
    }
    case FOLLOWER_INDEX_UNFOLLOW_SUCCESS: {
      const payload = action.payload;
      const byId = { ...state.byId };
      payload.itemsUnfollowed.forEach((id) => delete byId[id]);
      return { ...state, byId };
    }
    default:
      return state;
  }
};
