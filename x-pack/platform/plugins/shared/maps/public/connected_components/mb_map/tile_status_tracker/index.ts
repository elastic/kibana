/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { connect } from 'react-redux';
import { TileMetaFeature, TileError } from '../../../../common/descriptor_types';
import { setTileState } from '../../../actions';
import { getLayerList } from '../../../selectors/map_selectors';
import { MapStoreState } from '../../../reducers/store';
import { TileStatusTracker } from './tile_status_tracker';

function mapStateToProps(state: MapStoreState) {
  return {
    layerList: getLayerList(state),
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    onTileStateChange(
      layerId: string,
      areTilesLoaded: boolean,
      tileMetaFeatures?: TileMetaFeature[],
      tileErrors?: TileError[]
    ) {
      dispatch(setTileState(layerId, areTilesLoaded, tileMetaFeatures, tileErrors));
    },
  };
}

const connected = connect(mapStateToProps, mapDispatchToProps)(TileStatusTracker);
export { connected as TileStatusTracker };
