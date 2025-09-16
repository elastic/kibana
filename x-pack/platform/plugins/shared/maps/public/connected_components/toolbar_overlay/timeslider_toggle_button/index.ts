/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';
import { connect } from 'react-redux';
import { TimesliderToggleButton } from './timeslider_toggle_button';
import { closeTimeslider, openTimeslider } from '../../../actions';
import { getIsTimesliderOpen } from '../../../selectors/ui_selectors';
import type { MapStoreState } from '../../../reducers/store';

function mapStateToProps(state: MapStoreState) {
  return {
    isTimesliderOpen: getIsTimesliderOpen(state),
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    closeTimeslider: () => {
      dispatch(closeTimeslider());
    },
    openTimeslider: () => {
      dispatch(openTimeslider());
    },
  };
}

const connected = connect(mapStateToProps, mapDispatchToProps)(TimesliderToggleButton);
export { connected as TimesliderToggleButton };
