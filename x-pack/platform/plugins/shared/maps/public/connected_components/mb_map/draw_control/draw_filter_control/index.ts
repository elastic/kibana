/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';
import { connect } from 'react-redux';
import { DrawFilterControl } from './draw_filter_control';
import { setDrawMode, updateDrawState } from '../../../../actions';
import { getDrawState, getGeoFieldNames } from '../../../../selectors/map_selectors';
import { DRAW_MODE } from '../../../../../common/constants';
import type { MapStoreState } from '../../../../reducers/store';
import { getDrawMode } from '../../../../selectors/ui_selectors';

function mapStateToProps(state: MapStoreState) {
  return {
    drawState: getDrawState(state),
    filterModeActive: getDrawMode(state) === DRAW_MODE.DRAW_FILTERS,
    geoFieldNames: getGeoFieldNames(state),
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    disableDrawState() {
      dispatch(updateDrawState(null));
      dispatch(setDrawMode(DRAW_MODE.NONE));
    },
  };
}

const connected = connect(mapStateToProps, mapDispatchToProps)(DrawFilterControl);
export { connected as DrawFilterControl };
