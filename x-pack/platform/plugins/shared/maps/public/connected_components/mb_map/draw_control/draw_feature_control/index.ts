/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { connect } from 'react-redux';
import { Geometry, Position } from 'geojson';
import {
  DrawFeatureControl,
  ReduxDispatchProps,
  ReduxStateProps,
  OwnProps,
} from './draw_feature_control';
import { addNewFeatureToIndex, deleteFeatureFromIndex } from '../../../../actions';
import { MapStoreState } from '../../../../reducers/store';
import { getEditState, getLayerById } from '../../../../selectors/map_selectors';
import { getDrawMode } from '../../../../selectors/ui_selectors';

function mapStateToProps(state: MapStoreState): ReduxStateProps {
  const editState = getEditState(state);
  const editLayer = editState ? getLayerById(editState.layerId, state) : undefined;
  return {
    drawShape: editState ? editState.drawShape : undefined,
    drawMode: getDrawMode(state),
    editLayer,
  };
}

function mapDispatchToProps(
  dispatch: ThunkDispatch<MapStoreState, void, AnyAction>
): ReduxDispatchProps {
  return {
    addNewFeatureToIndex(geometries: Array<Geometry | Position[]>) {
      dispatch(addNewFeatureToIndex(geometries));
    },
    deleteFeatureFromIndex(featureId: string) {
      dispatch(deleteFeatureFromIndex(featureId));
    },
  };
}

const connected = connect<ReduxStateProps, ReduxDispatchProps, OwnProps, MapStoreState>(
  mapStateToProps,
  mapDispatchToProps
)(DrawFeatureControl);
export { connected as DrawFeatureControl };
