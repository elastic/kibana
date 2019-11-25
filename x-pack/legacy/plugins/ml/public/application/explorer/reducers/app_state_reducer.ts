/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash';

import { EXPLORER_ACTION } from '../explorer_constants';
import { Action } from '../explorer_dashboard_service';

export interface ExplorerAppState {
  mlExplorerSwimlane: any;
  mlExplorerFilter: any;
}

export function getExplorerDefaultAppState(): ExplorerAppState {
  return {
    mlExplorerSwimlane: {},
    mlExplorerFilter: {},
  };
}

export const appStateReducer = (state: ExplorerAppState, nextAction: Action) => {
  const { type, payload } = nextAction;

  const appState = cloneDeep(state);

  switch (type) {
    case EXPLORER_ACTION.APP_STATE_SET:
      return { ...appState, ...payload };

    case EXPLORER_ACTION.APP_STATE_CLEAR_SELECTION:
      delete appState.mlExplorerSwimlane.selectedType;
      delete appState.mlExplorerSwimlane.selectedLanes;
      delete appState.mlExplorerSwimlane.selectedTimes;
      delete appState.mlExplorerSwimlane.showTopFieldValues;
      return appState;

    case EXPLORER_ACTION.APP_STATE_SAVE_SELECTION:
      const swimlaneSelectedCells = payload.swimlaneSelectedCells;
      appState.mlExplorerSwimlane.selectedType = swimlaneSelectedCells.type;
      appState.mlExplorerSwimlane.selectedLanes = swimlaneSelectedCells.lanes;
      appState.mlExplorerSwimlane.selectedTimes = swimlaneSelectedCells.times;
      appState.mlExplorerSwimlane.showTopFieldValues = swimlaneSelectedCells.showTopFieldValues;
      appState.mlExplorerSwimlane.viewByFieldName = swimlaneSelectedCells.viewByFieldName;
      return appState;

    case EXPLORER_ACTION.APP_STATE_SAVE_SWIMLANE_VIEW_BY_FIELD_NAME:
      appState.mlExplorerSwimlane.viewByFieldName = payload.swimlaneViewByFieldName;
      return appState;

    case EXPLORER_ACTION.APP_STATE_SAVE_INFLUENCER_FILTER_SETTINGS:
      appState.mlExplorerFilter.influencersFilterQuery = payload.influencersFilterQuery;
      appState.mlExplorerFilter.filterActive = payload.filterActive;
      appState.mlExplorerFilter.filteredFields = payload.filteredFields;
      appState.mlExplorerFilter.queryString = payload.queryString;
      return appState;

    case EXPLORER_ACTION.APP_STATE_CLEAR_INFLUENCER_FILTER_SETTINGS:
      delete appState.mlExplorerFilter.influencersFilterQuery;
      delete appState.mlExplorerFilter.filterActive;
      delete appState.mlExplorerFilter.filteredFields;
      delete appState.mlExplorerFilter.queryString;
      return appState;

    default:
      return state;
  }
};
