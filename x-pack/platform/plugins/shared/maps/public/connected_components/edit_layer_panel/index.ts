/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { connect } from 'react-redux';
import { StyleDescriptor } from '../../../common/descriptor_types';
import { EditLayerPanel } from './edit_layer_panel';
import { getSelectedLayer } from '../../selectors/map_selectors';
import { updateLayerStyleForSelectedLayer, updateSourceProps } from '../../actions';
import { MapStoreState } from '../../reducers/store';
import type { OnSourceChangeArgs } from '../../classes/sources/source';
import { hasVectorSourceMethod } from '../../classes/sources/vector_source';
import { isLayerGroup } from '../../classes/layers/layer_group';

function mapStateToProps(state: MapStoreState) {
  const selectedLayer = getSelectedLayer(state);
  let key = 'none';
  if (selectedLayer) {
    const source = !isLayerGroup(selectedLayer) && selectedLayer.getSource();
    key =
      source && hasVectorSourceMethod(source, 'supportsJoins')
        ? `${selectedLayer.getId()}${source.supportsJoins()}`
        : selectedLayer.getId();
  }
  return {
    key,
    selectedLayer,
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    updateSourceProps: async (id: string, sourcePropChanges: OnSourceChangeArgs[]) =>
      await dispatch(updateSourceProps(id, sourcePropChanges)),
    updateStyleDescriptor: (styleDescriptor: StyleDescriptor) => {
      dispatch(updateLayerStyleForSelectedLayer(styleDescriptor));
    },
  };
}

const connected = connect(mapStateToProps, mapDispatchToProps)(EditLayerPanel);
export { connected as EditLayerPanel };
