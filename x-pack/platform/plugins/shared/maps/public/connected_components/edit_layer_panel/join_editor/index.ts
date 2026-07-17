/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnyAction } from 'redux-v4';
import type { ThunkDispatch } from 'redux-thunk-v2';
import { connect } from 'react-redux-v7';
import { JoinEditor } from './join_editor';
import { getSelectedLayerJoinDescriptors } from '../../../selectors/map_selectors';
import { setJoinsForLayer } from '../../../actions';
import type { MapStoreState } from '../../../reducers/store';
import type { ILayer } from '../../../classes/layers/layer';
import type { JoinDescriptor } from '../../../../common/descriptor_types';

function mapStateToProps(state: MapStoreState) {
  return {
    joins: getSelectedLayerJoinDescriptors(state),
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    onChange: (layer: ILayer, joins: Array<Partial<JoinDescriptor>>) => {
      dispatch(setJoinsForLayer(layer, joins));
    },
  };
}

const connectedJoinEditor = connect(mapStateToProps, mapDispatchToProps)(JoinEditor);
export { connectedJoinEditor as JoinEditor };
export type { JoinField } from './join_editor';
