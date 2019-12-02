/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EXPLORER_ACTION, SWIMLANE_TYPE } from '../../explorer_constants';
import { getClearedSelectedAnomaliesState } from '../../explorer_utils';

import { appStateReducer } from '../app_state_reducer';

import { ExplorerState } from './state';

interface SwimlanePoint {
  laneLabel: string;
  time: number;
}

// do a sanity check against selectedCells. It can happen that a previously
// selected lane loaded via URL/AppState is not available anymore.
// If filter is active - selectedCell may not be available due to swimlane view by change to filter fieldName
// Ok to keep cellSelection in this case
export const checkSelectedCells = (state: ExplorerState) => {
  const { filterActive, selectedCells, viewBySwimlaneData, viewBySwimlaneDataLoading } = state;

  if (viewBySwimlaneDataLoading) {
    return {};
  }

  let clearSelection = false;
  if (
    selectedCells !== null &&
    selectedCells.type === SWIMLANE_TYPE.VIEW_BY &&
    viewBySwimlaneData !== undefined &&
    viewBySwimlaneData.points !== undefined
  ) {
    clearSelection =
      filterActive === false &&
      !selectedCells.lanes.some((lane: string) => {
        return viewBySwimlaneData.points.some((point: SwimlanePoint) => {
          return (
            point.laneLabel === lane &&
            point.time >= selectedCells.times[0] &&
            point.time <= selectedCells.times[1]
          );
        });
      });
  }

  if (clearSelection === true) {
    return {
      appState: appStateReducer(state.appState, {
        type: EXPLORER_ACTION.APP_STATE_CLEAR_SELECTION,
      }),
      ...getClearedSelectedAnomaliesState(),
    };
  }

  return {};
};
