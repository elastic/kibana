/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { CalculatedFieldsPanel } from './calculated_fields_panel';
import { getSelectedLayer } from '../../../selectors/map_selectors';
import { ILayer } from '../../../layers/layer';
import { CalculatedFieldDescriptor } from '../../../../common/descriptor_types';

function mapStateToProps(state = {}) {
  return {
    //calculatedFields: getSelectedLayerCalculatedLayerDescriptors(state),
    layer: getSelectedLayer(state),
  };
}

function mapDispatchToProps(dispatch) {
  return {
    onChange: (layer: ILayer, calculatedFields: CalculatedFieldDescriptor[]): void => {
      //dispatch(setJoinsForLayer(layer, joins));
    },
  };
}

const connectedCalculatedFieldsPanel = connect(mapStateToProps, mapDispatchToProps)(CalculatedFieldsPanel);
export { connectedCalculatedFieldsPanel as CalculatedFieldsPanel };
