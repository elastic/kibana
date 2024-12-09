/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { connect } from 'react-redux';
import { FlyoutFooter } from './flyout_footer';

import { FLYOUT_STATE } from '../../../reducers/ui';
import { getSelectedLayer, hasDirtyState } from '../../../selectors/map_selectors';
import {
  setSelectedLayer,
  removeSelectedLayer,
  removeTrackedLayerStateForSelectedLayer,
  updateFlyout,
} from '../../../actions';
import { MapStoreState } from '../../../reducers/store';

function mapStateToProps(state: MapStoreState) {
  return {
    hasStateChanged: hasDirtyState(state),
    selectedLayer: getSelectedLayer(state),
  };
}

const mapDispatchToProps = (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) => {
  return {
    cancelLayerPanel: () => {
      dispatch(updateFlyout(FLYOUT_STATE.NONE));
      dispatch(setSelectedLayer(null));
    },
    saveLayerEdits: () => {
      dispatch(updateFlyout(FLYOUT_STATE.NONE));
      dispatch(removeTrackedLayerStateForSelectedLayer());
      dispatch(setSelectedLayer(null));
    },
    removeLayer: () => {
      dispatch(removeSelectedLayer());
    },
  };
};

const connectedFlyoutFooter = connect(mapStateToProps, mapDispatchToProps)(FlyoutFooter);
export { connectedFlyoutFooter as FlyoutFooter };
