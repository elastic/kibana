/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from '../action_types';
import { parseAutoFollowErrors } from '../../services/auto_follow_errors';

const initialState = {
  autoFollow: null,
};

const success = action => `${action}_SUCCESS`;

export const reducer = (state = initialState, action) => {
  switch (action.type) {
    case success(t.AUTO_FOLLOW_STATS_LOAD): {
      const { recentAutoFollowErrors, ...rest } = action.payload;
      return {
        ...state,
        autoFollow: {
          ...rest,
          recentAutoFollowErrors: parseAutoFollowErrors(recentAutoFollowErrors),
        },
      };
    }
    default:
      return state;
  }
};
