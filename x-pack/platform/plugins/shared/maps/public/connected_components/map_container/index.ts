/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';
import { connect } from 'react-redux';
import { MapContainer } from './map_container';
import {
  getFlyoutDisplay,
  getIsFullScreen,
  getIsTimesliderOpen,
} from '../../selectors/ui_selectors';
import {
  cancelAllInFlightRequests,
  exitFullScreen,
  setSelectedLayer,
  updateFlyout,
} from '../../actions';
import {
  isMapLoading,
  getLayerList,
  getMapInitError,
  getMapSettings,
  getQueryableUniqueIndexPatternIds,
  getSelectedLayerId,
} from '../../selectors/map_selectors';
import type { MapStoreState } from '../../reducers/store';
import { FLYOUT_STATE } from '../../reducers/ui';

function mapStateToProps(state: MapStoreState) {
  return {
    isTimesliderOpen: getIsTimesliderOpen(state),
    isMapLoading: isMapLoading(state),
    flyoutDisplay: getFlyoutDisplay(state),
    isFullScreen: getIsFullScreen(state),
    mapInitError: getMapInitError(state),
    indexPatternIds: getQueryableUniqueIndexPatternIds(state),
    settings: getMapSettings(state),
    layerList: getLayerList(state),
    selectedLayerId: getSelectedLayerId(state),
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    exitFullScreen: () => dispatch(exitFullScreen()),
    cancelAllInFlightRequests: () => dispatch(cancelAllInFlightRequests()),
    closeFlyout: () => {
      dispatch(updateFlyout(FLYOUT_STATE.NONE));
      dispatch(setSelectedLayer(null));
    },
  };
}

const connected = connect(mapStateToProps, mapDispatchToProps)(MapContainer);
export { connected as MapContainer };
