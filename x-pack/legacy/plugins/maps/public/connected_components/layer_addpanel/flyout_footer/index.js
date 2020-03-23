/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { FlyoutFooter } from './view';
import { getSelectedLayer } from '../../../selectors/map_selectors';
import { clearTransientLayerStateAndCloseFlyout } from '../../../actions/map_actions';

function mapStateToProps(state = {}) {
  const selectedLayer = getSelectedLayer(state);
  return {
    hasLayerSelected: !!selectedLayer,
    isLoading: selectedLayer && selectedLayer.isLayerLoading(),
  };
}

function mapDispatchToProps(dispatch) {
  return {
    closeFlyout: () => dispatch(clearTransientLayerStateAndCloseFlyout()),
  };
}

const connectedFlyOut = connect(mapStateToProps, mapDispatchToProps)(FlyoutFooter);
export { connectedFlyOut as FlyoutFooter };
