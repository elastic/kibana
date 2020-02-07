/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { TooltipControl } from './tooltip_control';
import { setTooltipState } from '../../../../actions/map_actions';
import {
  getLayerList,
  getTooltipState,
  isDrawingFilter,
} from '../../../../selectors/map_selectors';

function mapStateToProps(state = {}) {
  return {
    layerList: getLayerList(state),
    tooltipState: getTooltipState(state),
    isDrawingFilter: isDrawingFilter(state),
  };
}

function mapDispatchToProps(dispatch) {
  return {
    setTooltipState(tooltipState) {
      dispatch(setTooltipState(tooltipState));
    },
    clearTooltipState() {
      dispatch(setTooltipState(null));
    },
  };
}

const connectedTooltipControl = connect(mapStateToProps, mapDispatchToProps)(TooltipControl);
export { connectedTooltipControl as TooltipControl };
