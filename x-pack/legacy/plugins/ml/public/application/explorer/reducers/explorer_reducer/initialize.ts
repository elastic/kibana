/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionPayload } from '../../explorer_dashboard_service';
import { getInfluencers } from '../../explorer_utils';

import { getIndexPattern } from './get_index_pattern';
import { ExplorerState } from './state';

export const initialize = (state: ExplorerState, payload: ActionPayload): ExplorerState => {
  const { selectedCells, selectedJobs, viewBySwimlaneFieldName, filterData } = payload;
  let currentSelectedCells = state.selectedCells;
  let currentviewBySwimlaneFieldName = state.viewBySwimlaneFieldName;

  if (viewBySwimlaneFieldName !== undefined) {
    currentviewBySwimlaneFieldName = viewBySwimlaneFieldName;
  }

  if (selectedCells !== undefined && currentSelectedCells === null) {
    currentSelectedCells = selectedCells;
  }

  return {
    ...state,
    indexPattern: getIndexPattern(selectedJobs),
    noInfluencersConfigured: getInfluencers(selectedJobs).length === 0,
    selectedCells: currentSelectedCells,
    selectedJobs,
    viewBySwimlaneFieldName: currentviewBySwimlaneFieldName,
    ...(filterData.influencersFilterQuery !== undefined ? { ...filterData } : {}),
  };
};
