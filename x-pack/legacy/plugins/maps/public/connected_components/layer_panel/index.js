/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { LayerPanel } from './view';
import { getSelectedLayer } from '../../selectors/map_selectors';
import { fitToLayerExtent, updateSourceProp } from '../../actions/map_actions';

function mapStateToProps(state = {}) {
  return {
    selectedLayer: getSelectedLayer(state),
  };
}

function mapDispatchToProps(dispatch) {
  return {
    fitToBounds: layerId => {
      dispatch(fitToLayerExtent(layerId));
    },
    updateSourceProp: (id, propName, value) => dispatch(updateSourceProp(id, propName, value)),
  };
}

const connectedLayerPanel = connect(mapStateToProps, mapDispatchToProps)(LayerPanel);
export { connectedLayerPanel as LayerPanel };
