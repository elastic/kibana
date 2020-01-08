/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EXPLORER_ACTION } from '../../explorer_constants';
import { getClearedSelectedAnomaliesState } from '../../explorer_utils';

import { appStateReducer } from '../app_state_reducer';

import { ExplorerState } from './state';

export function clearInfluencerFilterSettings(state: ExplorerState): ExplorerState {
  const appStateClearInfluencer = appStateReducer(state.appState, {
    type: EXPLORER_ACTION.APP_STATE_CLEAR_INFLUENCER_FILTER_SETTINGS,
  });
  const appStateClearSelection = appStateReducer(appStateClearInfluencer, {
    type: EXPLORER_ACTION.APP_STATE_CLEAR_SELECTION,
  });

  return {
    ...state,
    appState: appStateClearSelection,
    filterActive: false,
    filteredFields: [],
    influencersFilterQuery: undefined,
    isAndOperator: false,
    maskAll: false,
    queryString: '',
    tableQueryString: '',
    ...getClearedSelectedAnomaliesState(),
  };
}
