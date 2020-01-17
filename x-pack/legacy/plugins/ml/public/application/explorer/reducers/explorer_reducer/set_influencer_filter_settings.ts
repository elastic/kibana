/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { VIEW_BY_JOB_LABEL } from '../../explorer_constants';
import { ActionPayload } from '../../explorer_dashboard_service';

import { ExplorerState } from './state';

export function setInfluencerFilterSettings(
  state: ExplorerState,
  payload: ActionPayload
): ExplorerState {
  const {
    filterQuery: influencersFilterQuery,
    isAndOperator,
    filteredFields,
    queryString,
    tableQueryString,
  } = payload;

  const { selectedCells, viewBySwimlaneOptions } = state;
  let selectedViewByFieldName = state.viewBySwimlaneFieldName;

  // if it's an AND filter set view by swimlane to job ID as the others will have no results
  if (isAndOperator && selectedCells === null) {
    selectedViewByFieldName = VIEW_BY_JOB_LABEL;
  } else {
    // Set View by dropdown to first relevant fieldName based on incoming filter if there's no cell selection already
    // or if selected cell is from overall swimlane as this won't include an additional influencer filter
    for (let i = 0; i < filteredFields.length; i++) {
      if (
        viewBySwimlaneOptions.includes(filteredFields[i]) &&
        (selectedCells === null || (selectedCells && selectedCells.type === 'overall'))
      ) {
        selectedViewByFieldName = filteredFields[i];
        break;
      }
    }
  }

  return {
    ...state,
    filterActive: true,
    filteredFields,
    influencersFilterQuery,
    isAndOperator,
    queryString,
    tableQueryString,
    maskAll:
      selectedViewByFieldName === VIEW_BY_JOB_LABEL ||
      filteredFields.includes(selectedViewByFieldName) === false,
    viewBySwimlaneFieldName: selectedViewByFieldName,
  };
}
