/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { npStart } from 'ui/new_platform';
import { ActionToaster, AppToast } from '../toasters';
import { start } from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/legacy';
import {
  APPLY_FILTER_TRIGGER,
  CONTEXT_MENU_TRIGGER,
  PANEL_BADGE_TRIGGER,
  APPLY_FILTER_ACTION,
  ViewMode,
} from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';
import {
  APPLY_SIEM_FILTER_ACTION_ID,
  ApplySiemFilterAction,
} from './actions/apply_siem_filter_action';
import { IndexPatternMapping, MapEmbeddable, SetQuery } from './types';
import { getLayerList } from './map_config';
// @ts-ignore Missing type defs as maps moves to Typescript
import { MAP_SAVED_OBJECT_TYPE } from '../../../../maps/common/constants';
import * as i18n from './translations';

/**
 * Displays an error toast for the provided title and message
 *
 * @param errorTitle Title of error to display in toaster and modal
 * @param errorMessage Message to display in error modal when clicked
 * @param dispatchToaster provided by useStateToaster()
 */
export const displayErrorToast = (
  errorTitle: string,
  errorMessage: string,
  dispatchToaster: React.Dispatch<ActionToaster>
) => {
  const toast: AppToast = {
    id: uuid.v4(),
    title: errorTitle,
    color: 'danger',
    iconType: 'alert',
    errors: [errorMessage],
  };
  dispatchToaster({
    type: 'addToaster',
    toast,
  });
};

/**
 * Temporary Embeddables API configuration override until ability to edit actions is addressed:
 * https://github.com/elastic/kibana/issues/43643
 *
 * @param applyFilterQueryFromKueryExpression function for updating KQL as provided by NetworkFilter
 *
 * @throws Error if action is already registered
 */
export const setupEmbeddablesAPI = (
  applyFilterQueryFromKueryExpression: (expression: string) => void
) => {
  try {
    const actions = npStart.plugins.uiActions.getTriggerActions(APPLY_FILTER_TRIGGER);
    const actionLoaded = actions.some(a => a.id === APPLY_SIEM_FILTER_ACTION_ID);
    if (!actionLoaded) {
      const siemFilterAction = new ApplySiemFilterAction({
        applyFilterQueryFromKueryExpression,
      });
      npStart.plugins.uiActions.registerAction(siemFilterAction);
      npStart.plugins.uiActions.attachAction(APPLY_FILTER_TRIGGER, siemFilterAction.id);

      npStart.plugins.uiActions.detachAction(CONTEXT_MENU_TRIGGER, 'CUSTOM_TIME_RANGE');
      npStart.plugins.uiActions.detachAction(PANEL_BADGE_TRIGGER, 'CUSTOM_TIME_RANGE_BADGE');
      npStart.plugins.uiActions.detachAction(APPLY_FILTER_TRIGGER, APPLY_FILTER_ACTION);
    }
  } catch (e) {
    throw e;
  }
};

/**
 * Creates MapEmbeddable with provided initial configuration
 *
 * @param indexPatterns list of index patterns to configure layers for
 * @param queryExpression initial query constraints as an expression
 * @param startDate
 * @param endDate
 * @param setQuery function as provided by the GlobalTime component for reacting to refresh
 *
 * @throws Error if EmbeddableFactory does not exist
 */
export const createEmbeddable = async (
  indexPatterns: IndexPatternMapping[],
  queryExpression: string,
  startDate: number,
  endDate: number,
  setQuery: SetQuery
): Promise<MapEmbeddable> => {
  const factory = start.getEmbeddableFactory(MAP_SAVED_OBJECT_TYPE);

  const state = {
    layerList: getLayerList(indexPatterns),
    title: i18n.MAP_TITLE,
  };
  const input = {
    id: uuid.v4(),
    filters: [],
    hidePanelTitles: true,
    query: { query: queryExpression, language: 'kuery' },
    refreshConfig: { value: 0, pause: true },
    timeRange: {
      from: new Date(startDate).toISOString(),
      to: new Date(endDate).toISOString(),
    },
    viewMode: ViewMode.VIEW,
    isLayerTOCOpen: false,
    openTOCDetails: [],
    hideFilterActions: false,
    mapCenter: { lon: -1.05469, lat: 15.96133, zoom: 1 },
  };

  // @ts-ignore method added in https://github.com/elastic/kibana/pull/43878
  const embeddableObject = await factory.createFromState(state, input);

  // Wire up to app refresh action
  setQuery({
    id: 'embeddedMap', // Scope to page type if using map elsewhere
    inspect: null,
    loading: false,
    refetch: embeddableObject.reload,
  });

  return embeddableObject;
};
