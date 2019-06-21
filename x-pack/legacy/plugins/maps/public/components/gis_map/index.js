/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { GisMap } from './view';
import { getFlyoutDisplay, getIsFullScreen, exitFullScreen, FLYOUT_STATE } from '../../store/ui';
import { triggerRefreshTimer } from '../../actions/store_actions';
import { getRefreshConfig, getMapInitError } from '../../selectors/map_selectors';

function mapStateToProps(state = {}) {
  const flyoutDisplay = getFlyoutDisplay(state);
  return {
    layerDetailsVisible: flyoutDisplay === FLYOUT_STATE.LAYER_PANEL,
    addLayerVisible: flyoutDisplay === FLYOUT_STATE.ADD_LAYER_WIZARD,
    noFlyoutVisible: flyoutDisplay === FLYOUT_STATE.NONE,
    isFullScreen: getIsFullScreen(state),
    refreshConfig: getRefreshConfig(state),
    mapInitError: getMapInitError(state),
  };
}

function mapDispatchToProps(dispatch) {
  return {
    triggerRefreshTimer: () => dispatch(triggerRefreshTimer()),
    exitFullScreen: () => dispatch(exitFullScreen()),
  };
}

const connectedGisMap = connect(mapStateToProps, mapDispatchToProps)(GisMap);
export { connectedGisMap as GisMap };
