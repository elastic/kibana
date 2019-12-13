/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { GisMap } from './view';
import { FLYOUT_STATE } from '../../reducers/ui';
import { exitFullScreen } from '../../actions/ui_actions';
import { getFlyoutDisplay, getIsFullScreen } from '../../selectors/ui_selectors';
import { triggerRefreshTimer, cancelAllInFlightRequests } from '../../actions/map_actions';
import {
  areLayersLoaded,
  getRefreshConfig,
  getMapInitError,
  getQueryableUniqueIndexPatternIds,
  isToolbarOverlayHidden,
} from '../../selectors/map_selectors';

function mapStateToProps(state = {}) {
  const flyoutDisplay = getFlyoutDisplay(state);
  return {
    areLayersLoaded: areLayersLoaded(state),
    layerDetailsVisible: flyoutDisplay === FLYOUT_STATE.LAYER_PANEL,
    addLayerVisible: flyoutDisplay === FLYOUT_STATE.ADD_LAYER_WIZARD,
    noFlyoutVisible: flyoutDisplay === FLYOUT_STATE.NONE,
    isFullScreen: getIsFullScreen(state),
    refreshConfig: getRefreshConfig(state),
    mapInitError: getMapInitError(state),
    indexPatternIds: getQueryableUniqueIndexPatternIds(state),
    hideToolbarOverlay: isToolbarOverlayHidden(state),
  };
}

function mapDispatchToProps(dispatch) {
  return {
    triggerRefreshTimer: () => dispatch(triggerRefreshTimer()),
    exitFullScreen: () => dispatch(exitFullScreen()),
    cancelAllInFlightRequests: () => dispatch(cancelAllInFlightRequests()),
  };
}

const connectedGisMap = connect(mapStateToProps, mapDispatchToProps)(GisMap);
export { connectedGisMap as GisMap };
