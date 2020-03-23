/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from '../action_types';
import { arrayToObject } from '../../services/utils';

const initialState = {
  byId: {},
  selectedDetailId: null,
  selectedEditId: null,
};

const success = action => `${action}_SUCCESS`;

const parseFollowerIndex = followerIndex => {
  // Extract status into boolean
  return { ...followerIndex, isPaused: followerIndex.status === 'paused' };
};
export const reducer = (state = initialState, action) => {
  switch (action.type) {
    case success(t.FOLLOWER_INDEX_LOAD): {
      return {
        ...state,
        byId: arrayToObject(action.payload.indices.map(parseFollowerIndex), 'name'),
      };
    }
    case success(t.FOLLOWER_INDEX_GET): {
      return {
        ...state,
        byId: { ...state.byId, [action.payload.name]: parseFollowerIndex(action.payload) },
      };
    }
    case t.FOLLOWER_INDEX_SELECT_DETAIL: {
      return { ...state, selectedDetailId: action.payload };
    }
    case t.FOLLOWER_INDEX_SELECT_EDIT: {
      return { ...state, selectedEditId: action.payload };
    }
    case success(t.FOLLOWER_INDEX_UNFOLLOW): {
      const byId = { ...state.byId };
      const { itemsUnfollowed } = action.payload;
      itemsUnfollowed.forEach(id => delete byId[id]);
      return { ...state, byId };
    }
    default:
      return state;
  }
};
