/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from '../action_types';
import { arrayToObject } from '../../services/utils';
import { getPrefixSuffixFromFollowPattern } from '../../services/auto_follow_pattern';

const initialState = {
  byId: {},
  selectedDetailId: null,
  selectedEditId: null,
};

const success = action => `${action}_SUCCESS`;

const parseAutoFollowPattern = autoFollowPattern => {
  // Extract prefix and suffix from follow index pattern
  const { followIndexPatternPrefix, followIndexPatternSuffix } = getPrefixSuffixFromFollowPattern(
    autoFollowPattern.followIndexPattern
  );

  return { ...autoFollowPattern, followIndexPatternPrefix, followIndexPatternSuffix };
};

export const reducer = (state = initialState, action) => {
  switch (action.type) {
    case success(t.AUTO_FOLLOW_PATTERN_LOAD): {
      return {
        ...state,
        byId: arrayToObject(action.payload.patterns.map(parseAutoFollowPattern), 'name'),
      };
    }
    case success(t.AUTO_FOLLOW_PATTERN_GET): {
      return {
        ...state,
        byId: { ...state.byId, [action.payload.name]: parseAutoFollowPattern(action.payload) },
      };
    }
    case t.AUTO_FOLLOW_PATTERN_SELECT_DETAIL: {
      return { ...state, selectedDetailId: action.payload };
    }
    case t.AUTO_FOLLOW_PATTERN_SELECT_EDIT: {
      return { ...state, selectedEditId: action.payload };
    }
    case success(t.AUTO_FOLLOW_PATTERN_DELETE): {
      const byId = { ...state.byId };
      const { itemsDeleted } = action.payload;
      itemsDeleted.forEach(id => delete byId[id]);
      return { ...state, byId };
    }
    default:
      return state;
  }
};
