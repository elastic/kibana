/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { GisMap } from './view';
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
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { getCoreChrome } from '../../../../../../plugins/maps/public/kibana_services';

function mapStateToProps(state = {}) {
  return {
    areLayersLoaded: areLayersLoaded(state),
    flyoutDisplay: getFlyoutDisplay(state),
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
    exitFullScreen: () => {
      dispatch(exitFullScreen());
      getCoreChrome().setIsVisible(true);
    },
    cancelAllInFlightRequests: () => dispatch(cancelAllInFlightRequests()),
  };
}

const connectedGisMap = connect(mapStateToProps, mapDispatchToProps)(GisMap);
export { connectedGisMap as GisMap };
