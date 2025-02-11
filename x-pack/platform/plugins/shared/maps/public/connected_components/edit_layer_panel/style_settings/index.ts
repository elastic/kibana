/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { connect } from 'react-redux';
import { StyleSettings } from './style_settings';
import { getSelectedLayer } from '../../../selectors/map_selectors';
import { updateCustomIcons, updateLayerStyleForSelectedLayer } from '../../../actions';
import { MapStoreState } from '../../../reducers/store';
import { CustomIcon, StyleDescriptor } from '../../../../common/descriptor_types';

function mapStateToProps(state: MapStoreState) {
  return {
    layer: getSelectedLayer(state)!,
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    updateStyleDescriptor: (styleDescriptor: StyleDescriptor) => {
      dispatch(updateLayerStyleForSelectedLayer(styleDescriptor));
    },
    updateCustomIcons: (customIcons: CustomIcon[]) => {
      dispatch(updateCustomIcons(customIcons));
    },
  };
}

const connectedStyleSettings = connect(mapStateToProps, mapDispatchToProps)(StyleSettings);
export { connectedStyleSettings as StyleSettings };
