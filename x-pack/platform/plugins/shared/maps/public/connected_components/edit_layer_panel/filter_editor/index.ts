/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { connect } from 'react-redux';
import type { Query } from '@kbn/es-query';
import { FilterEditor } from './filter_editor';
import { getEditState, getSelectedLayer } from '../../../selectors/map_selectors';
import { setLayerQuery, updateSourceProp } from '../../../actions';
import { MapStoreState } from '../../../reducers/store';

function mapStateToProps(state: MapStoreState) {
  const layer = getSelectedLayer(state)!;
  return {
    layer,
    isFeatureEditorOpenForLayer: getEditState(state)?.layerId === layer.getId(),
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    setLayerQuery: (layerId: string, query: Query) => {
      dispatch(setLayerQuery(layerId, query));
    },
    updateSourceProp: (id: string, propName: string, value: unknown) =>
      dispatch(updateSourceProp(id, propName, value)),
  };
}

const connectedFilterEditor = connect(mapStateToProps, mapDispatchToProps)(FilterEditor);
export { connectedFilterEditor as FilterEditor };
