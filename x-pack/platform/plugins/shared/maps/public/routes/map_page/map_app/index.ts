/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import type { ThunkDispatch } from 'redux-thunk';
import type { AnyAction } from 'redux';
import type { KibanaExecutionContext } from '@kbn/core/public';
import type { Filter, ProjectRouting } from '@kbn/es-query';
import type { Query, TimeRange } from '@kbn/es-query';
import { MapApp } from './map_app';
import { getFlyoutDisplay, getIsFullScreen } from '../../../selectors/ui_selectors';
import {
  getFilters,
  getQuery,
  getQueryableUniqueIndexPatternIds,
  getTimeFilters,
  hasDirtyState,
} from '../../../selectors/map_selectors';
import { setQuery, setExecutionContext, enableFullScreen, openMapSettings } from '../../../actions';
import { FLYOUT_STATE } from '../../../reducers/ui';
import { getInspectorAdapters } from '../../../reducers/non_serializable_instances';
import type { MapStoreState } from '../../../reducers/store';

function mapStateToProps(state: MapStoreState) {
  return {
    isFullScreen: getIsFullScreen(state),
    isOpenSettingsDisabled: getFlyoutDisplay(state) !== FLYOUT_STATE.NONE,
    isSaveDisabled: hasDirtyState(state),
    inspectorAdapters: getInspectorAdapters(state),
    nextIndexPatternIds: getQueryableUniqueIndexPatternIds(state),
    flyoutDisplay: getFlyoutDisplay(state),
    filters: getFilters(state),
    query: getQuery(state),
    timeFilters: getTimeFilters(state),
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    setQuery: ({
      forceRefresh,
      filters,
      query,
      timeFilters,
      searchSessionId,
      projectRouting,
    }: {
      filters?: Filter[];
      query?: Query;
      timeFilters?: TimeRange;
      forceRefresh?: boolean;
      searchSessionId?: string;
      projectRouting?: ProjectRouting;
    }) => {
      dispatch(
        setQuery({
          filters,
          query,
          timeFilters,
          forceRefresh,
          searchSessionId,
          projectRouting,
        })
      );
    },
    enableFullScreen: () => dispatch(enableFullScreen()),
    openMapSettings: () => dispatch(openMapSettings()),
    setExecutionContext: (executionContext: KibanaExecutionContext) =>
      dispatch(setExecutionContext(executionContext)),
  };
}

const connectedComponent = connect(mapStateToProps, mapDispatchToProps)(MapApp);
export { connectedComponent as MapApp };
