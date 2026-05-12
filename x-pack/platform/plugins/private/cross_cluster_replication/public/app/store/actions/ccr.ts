/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnyAction } from 'redux';
import type { ThunkAction } from 'redux-thunk';
import { SECTIONS } from '../../constants';
import { loadAutoFollowStats as loadAutoFollowStatsRequest } from '../../services/api';
import * as t from '../action_types';
import { sendApiRequest } from './api';
import type { CcrState } from '../reducers';

const { CCR_STATS: scope } = SECTIONS;

export const loadAutoFollowStats = (): ThunkAction<Promise<void>, CcrState, undefined, AnyAction> =>
  sendApiRequest({
    label: t.AUTO_FOLLOW_STATS_LOAD,
    scope,
    handler: async () => await loadAutoFollowStatsRequest(),
  });
