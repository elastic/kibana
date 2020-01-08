/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { connect } from 'react-redux';
import { TOCEntry } from './view';
import { FLYOUT_STATE } from '../../../../../reducers/ui';
import { updateFlyout, hideTOCDetails, showTOCDetails } from '../../../../../actions/ui_actions';
import { getIsReadOnly, getOpenTOCDetails } from '../../../../../selectors/ui_selectors';
import {
  fitToLayerExtent,
  setSelectedLayer,
  toggleLayerVisible,
  removeTransientLayer,
  cloneLayer,
  removeLayer,
} from '../../../../../actions/map_actions';

import {
  hasDirtyState,
  getSelectedLayer,
  isUsingSearch,
} from '../../../../../selectors/map_selectors';

function mapStateToProps(state = {}, ownProps) {
  return {
    isReadOnly: getIsReadOnly(state),
    zoom: _.get(state, 'map.mapState.zoom', 0),
    selectedLayer: getSelectedLayer(state),
    hasDirtyStateSelector: hasDirtyState(state),
    isLegendDetailsOpen: getOpenTOCDetails(state).includes(ownProps.layer.getId()),
    isUsingSearch: isUsingSearch(state),
  };
}

function mapDispatchToProps(dispatch) {
  return {
    openLayerPanel: async layerId => {
      await dispatch(removeTransientLayer());
      await dispatch(setSelectedLayer(layerId));
      dispatch(updateFlyout(FLYOUT_STATE.LAYER_PANEL));
    },
    toggleVisible: layerId => {
      dispatch(toggleLayerVisible(layerId));
    },
    fitToBounds: layerId => {
      dispatch(fitToLayerExtent(layerId));
    },
    cloneLayer: layerId => {
      dispatch(cloneLayer(layerId));
    },
    removeLayer: layerId => {
      dispatch(removeLayer(layerId));
    },
    hideTOCDetails: layerId => {
      dispatch(hideTOCDetails(layerId));
    },
    showTOCDetails: layerId => {
      dispatch(showTOCDetails(layerId));
    },
  };
}

const connectedTOCEntry = connect(mapStateToProps, mapDispatchToProps)(TOCEntry);
export { connectedTOCEntry as TOCEntry };
