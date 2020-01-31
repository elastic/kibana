/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { LayerSettings } from './layer_settings';
import { getSelectedLayer } from '../../../selectors/map_selectors';
import {
  updateLayerLabel,
  updateLayerMaxZoom,
  updateLayerMinZoom,
  updateLayerAlpha,
  setLayerApplyGlobalQuery,
} from '../../../actions/map_actions';

function mapStateToProps(state = {}) {
  const selectedLayer = getSelectedLayer(state);
  return {
    alpha: selectedLayer.getAlpha(),
    applyGlobalQuery: selectedLayer.getApplyGlobalQuery(),
    label: selectedLayer.getLabel(),
    layerId: selectedLayer.getId(),
    maxZoom: selectedLayer.getMaxZoom(),
    minZoom: selectedLayer.getMinZoom(),
    layer: selectedLayer,
  };
}

function mapDispatchToProps(dispatch) {
  return {
    updateLabel: (id, label) => dispatch(updateLayerLabel(id, label)),
    updateMinZoom: (id, minZoom) => dispatch(updateLayerMinZoom(id, minZoom)),
    updateMaxZoom: (id, maxZoom) => dispatch(updateLayerMaxZoom(id, maxZoom)),
    updateAlpha: (id, alpha) => dispatch(updateLayerAlpha(id, alpha)),
    setLayerApplyGlobalQuery: (layerId, applyGlobalQuery) => {
      dispatch(setLayerApplyGlobalQuery(layerId, applyGlobalQuery));
    },
  };
}

const connectedLayerSettings = connect(
  mapStateToProps,
  mapDispatchToProps
)(LayerSettings);
export { connectedLayerSettings as LayerSettings };
