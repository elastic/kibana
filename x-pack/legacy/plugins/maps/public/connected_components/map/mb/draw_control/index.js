/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { DrawControl } from './draw_control';
import { updateDrawState } from '../../../../actions/map_actions';
import { getDrawState, isDrawingFilter } from '../../../../selectors/map_selectors';

function mapStateToProps(state = {}) {
  return {
    isDrawingFilter: isDrawingFilter(state),
    drawState: getDrawState(state),
  };
}

function mapDispatchToProps(dispatch) {
  return {
    disableDrawState() {
      dispatch(updateDrawState(null));
    },
  };
}

const connectedDrawControl = connect(
  mapStateToProps,
  mapDispatchToProps
)(DrawControl);
export { connectedDrawControl as DrawControl };
