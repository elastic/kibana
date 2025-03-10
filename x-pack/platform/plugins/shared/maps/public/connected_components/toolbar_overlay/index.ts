/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { ToolbarOverlay } from './toolbar_overlay';
import { MapStoreState } from '../../reducers/store';
import { getDrawMode } from '../../selectors/ui_selectors';
import { getGeoFieldNames } from '../../selectors/map_selectors';
import { DRAW_MODE } from '../../../common/constants';

function mapStateToProps(state: MapStoreState) {
  return {
    showToolsControl: getGeoFieldNames(state).length !== 0,
    shapeDrawModeActive: getDrawMode(state) === DRAW_MODE.DRAW_SHAPES,
    pointDrawModeActive: getDrawMode(state) === DRAW_MODE.DRAW_POINTS,
  };
}

const connected = connect(mapStateToProps)(ToolbarOverlay);
export { connected as ToolbarOverlay };
