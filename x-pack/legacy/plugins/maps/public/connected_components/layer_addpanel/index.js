/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { AddLayerPanel } from './view';
import { FLYOUT_STATE, INDEXING_STAGE } from '../../reducers/ui';
import { updateFlyout, updateIndexingStage } from '../../actions/ui_actions';
import { getFlyoutDisplay, getIndexingStage } from '../../selectors/ui_selectors';
import { getMapColors } from '../../selectors/map_selectors';
import { getInspectorAdapters } from '../../reducers/non_serializable_instances';
import {
  setTransientLayer,
  addLayer,
  setSelectedLayer,
  removeTransientLayer,
} from '../../actions/map_actions';

function mapStateToProps(state = {}) {
  const indexingStage = getIndexingStage(state);
  return {
    inspectorAdapters: getInspectorAdapters(state),
    flyoutVisible: getFlyoutDisplay(state) !== FLYOUT_STATE.NONE,
    mapColors: getMapColors(state),
    isIndexingTriggered: indexingStage === INDEXING_STAGE.TRIGGERED,
    isIndexingSuccess: indexingStage === INDEXING_STAGE.SUCCESS,
    isIndexingReady: indexingStage === INDEXING_STAGE.READY,
  };
}

function mapDispatchToProps(dispatch) {
  return {
    viewLayer: async layer => {
      await dispatch(setSelectedLayer(null));
      await dispatch(removeTransientLayer());
      dispatch(addLayer(layer.toLayerDescriptor()));
      dispatch(setSelectedLayer(layer.getId()));
      dispatch(setTransientLayer(layer.getId()));
    },
    removeTransientLayer: () => {
      dispatch(setSelectedLayer(null));
      dispatch(removeTransientLayer());
    },
    selectLayerAndAdd: () => {
      dispatch(setTransientLayer(null));
      dispatch(updateFlyout(FLYOUT_STATE.LAYER_PANEL));
    },
    setIndexingTriggered: () => dispatch(updateIndexingStage(INDEXING_STAGE.TRIGGERED)),
    resetIndexing: () => dispatch(updateIndexingStage(null)),
  };
}

const connectedFlyOut = connect(mapStateToProps, mapDispatchToProps, null, { forwardRef: true })(
  AddLayerPanel
);
export { connectedFlyOut as AddLayerPanel };
