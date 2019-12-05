/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EXPLORER_ACTION, VIEW_BY_JOB_LABEL } from '../../explorer_constants';
import { ActionPayload } from '../../explorer_dashboard_service';
import {
  getClearedSelectedAnomaliesState,
  getDefaultSwimlaneData,
  getInfluencers,
} from '../../explorer_utils';

import { appStateReducer } from '../app_state_reducer';

import { getIndexPattern } from './get_index_pattern';
import { getExplorerDefaultState, ExplorerState } from './state';

export const jobSelectionChange = (state: ExplorerState, payload: ActionPayload): ExplorerState => {
  const { selectedJobs } = payload;
  const stateUpdate: ExplorerState = {
    ...state,
    appState: appStateReducer(getExplorerDefaultState().appState, {
      type: EXPLORER_ACTION.APP_STATE_CLEAR_SELECTION,
    }),
    ...getClearedSelectedAnomaliesState(),
    noInfluencersConfigured: getInfluencers(selectedJobs).length === 0,
    overallSwimlaneData: getDefaultSwimlaneData(),
    selectedJobs,
  };

  // clear filter if selected jobs have no influencers
  if (stateUpdate.noInfluencersConfigured === true) {
    stateUpdate.appState = appStateReducer(stateUpdate.appState, {
      type: EXPLORER_ACTION.APP_STATE_CLEAR_INFLUENCER_FILTER_SETTINGS,
    });
    const noFilterState = {
      filterActive: false,
      filteredFields: [],
      influencersFilterQuery: undefined,
      maskAll: false,
      queryString: '',
      tableQueryString: '',
    };

    Object.assign(stateUpdate, noFilterState);
  } else {
    // indexPattern will not be used if there are no influencers so set up can be skipped
    // indexPattern is passed to KqlFilterBar which is only shown if (noInfluencersConfigured === false)
    stateUpdate.indexPattern = getIndexPattern(selectedJobs);
  }

  if (selectedJobs.length > 1) {
    stateUpdate.viewBySwimlaneFieldName = VIEW_BY_JOB_LABEL;
    return stateUpdate;
  }

  stateUpdate.loading = true;
  return stateUpdate;
};
