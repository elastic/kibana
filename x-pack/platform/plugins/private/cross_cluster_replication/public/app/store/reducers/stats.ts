/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AutoFollowStats } from '../../../../common/types';
import * as t from '../action_types';
import type { ParsedAutoFollowError } from '../../services/auto_follow_errors';
import { parseAutoFollowErrors } from '../../services/auto_follow_errors';

export type AutoFollowStatsWithParsedErrors = Omit<AutoFollowStats, 'recentAutoFollowErrors'> & {
  recentAutoFollowErrors: Record<string, ParsedAutoFollowError[]>;
};

export interface StatsState {
  autoFollow: AutoFollowStatsWithParsedErrors | null;
}

const initialState: StatsState = {
  autoFollow: null,
};

const AUTO_FOLLOW_STATS_LOAD_SUCCESS: `${typeof t.AUTO_FOLLOW_STATS_LOAD}_SUCCESS` = `${t.AUTO_FOLLOW_STATS_LOAD}_SUCCESS`;

export interface LoadAutoFollowStatsSuccessAction {
  type: typeof AUTO_FOLLOW_STATS_LOAD_SUCCESS;
  payload: AutoFollowStats;
}

export type StatsReducerAction = LoadAutoFollowStatsSuccessAction;

export const reducer = (
  state: StatsState = initialState,
  action: StatsReducerAction
): StatsState => {
  switch (action.type) {
    case AUTO_FOLLOW_STATS_LOAD_SUCCESS: {
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
