/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { StyleSettings } from './style_settings';
import { getSelectedLayer } from '../../../selectors/map_selectors';
import { updateLayerStyleForSelectedLayer } from '../../../actions/map_actions';

function mapStateToProps(state = {}) {
  return {
    layer: getSelectedLayer(state),
  };
}

function mapDispatchToProps(dispatch) {
  return {
    updateStyleDescriptor: styleDescriptor => {
      dispatch(updateLayerStyleForSelectedLayer(styleDescriptor));
    },
  };
}

const connectedStyleSettings = connect(
  mapStateToProps,
  mapDispatchToProps
)(StyleSettings);
export { connectedStyleSettings as StyleSettings };
