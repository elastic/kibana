/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { FlyoutFooter } from './view';
import { FLYOUT_STATE } from '../../../reducers/ui';
import { updateFlyout } from '../../../actions/ui_actions';
import { hasDirtyState } from '../../../selectors/map_selectors';
import {
  setSelectedLayer,
  removeSelectedLayer,
  removeTrackedLayerStateForSelectedLayer,
} from '../../../actions/map_actions';

function mapStateToProps(state = {}) {
  return {
    hasStateChanged: hasDirtyState(state),
  };
}

const mapDispatchToProps = dispatch => {
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
      dispatch(updateFlyout(FLYOUT_STATE.NONE));
      dispatch(removeSelectedLayer());
    },
  };
};

const connectedFlyoutFooter = connect(
  mapStateToProps,
  mapDispatchToProps
)(FlyoutFooter);
export { connectedFlyoutFooter as FlyoutFooter };
