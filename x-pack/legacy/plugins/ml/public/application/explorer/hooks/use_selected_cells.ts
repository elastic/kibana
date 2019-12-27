/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useUrlState } from '../../util/url_state';
import { SWIMLANE_TYPE } from '../../explorer/explorer_constants';
import { AppStateSelectedCells } from '../../explorer/explorer_utils';

export const useSelectedCells = () => {
  const [appState, setAppState] = useUrlState('_a');

  let selectedCells: AppStateSelectedCells | undefined;

  // keep swimlane selection, restore selectedCells from AppState
  if (
    appState &&
    appState.mlExplorerSwimlane &&
    appState.mlExplorerSwimlane.selectedType !== undefined
  ) {
    selectedCells = {
      type: appState.mlExplorerSwimlane.selectedType,
      lanes: appState.mlExplorerSwimlane.selectedLanes,
      times: appState.mlExplorerSwimlane.selectedTimes,
      showTopFieldValues: appState.mlExplorerSwimlane.showTopFieldValues,
      viewByFieldName: appState.mlExplorerSwimlane.viewByFieldName,
    };
  }

  const setSelectedCells = (swimlaneSelectedCells: AppStateSelectedCells) => {
    if (swimlaneSelectedCells !== undefined) {
      swimlaneSelectedCells.showTopFieldValues = false;

      const currentSwimlaneType = selectedCells?.type;
      const currentShowTopFieldValues = selectedCells?.showTopFieldValues;
      const newSwimlaneType = selectedCells?.type;

      if (
        (currentSwimlaneType === SWIMLANE_TYPE.OVERALL &&
          newSwimlaneType === SWIMLANE_TYPE.VIEW_BY) ||
        newSwimlaneType === SWIMLANE_TYPE.OVERALL ||
        currentShowTopFieldValues === true
      ) {
        swimlaneSelectedCells.showTopFieldValues = true;
      }

      appState.mlExplorerSwimlane.selectedType = swimlaneSelectedCells.type;
      appState.mlExplorerSwimlane.selectedLanes = swimlaneSelectedCells.lanes;
      appState.mlExplorerSwimlane.selectedTimes = swimlaneSelectedCells.times;
      appState.mlExplorerSwimlane.showTopFieldValues = swimlaneSelectedCells.showTopFieldValues;
      setAppState('mlExplorerSwimlane', appState.mlExplorerSwimlane);
    }
  };

  return [selectedCells, setSelectedCells];
};
