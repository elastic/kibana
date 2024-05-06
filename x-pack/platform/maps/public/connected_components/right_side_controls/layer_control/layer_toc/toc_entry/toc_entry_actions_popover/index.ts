/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { connect } from 'react-redux';
import { MapStoreState } from '../../../../../../reducers/store';
import {
  cloneLayer,
  fitToLayerExtent,
  removeLayer,
  setDrawMode,
  showThisLayerOnly,
  toggleLayerVisible,
  ungroupLayer,
  updateEditLayer,
} from '../../../../../../actions';
import { getLayerListRaw } from '../../../../../../selectors/map_selectors';
import { getIsReadOnly } from '../../../../../../selectors/ui_selectors';
import { TOCEntryActionsPopover } from './toc_entry_actions_popover';
import { DRAW_MODE } from '../../../../../../../common/constants';

function mapStateToProps(state: MapStoreState) {
  return {
    isReadOnly: getIsReadOnly(state),
    numLayers: getLayerListRaw(state).length,
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    cloneLayer: (layerId: string) => {
      dispatch(cloneLayer(layerId));
    },
    fitToBounds: (layerId: string) => {
      dispatch(fitToLayerExtent(layerId));
    },
    removeLayer: (layerId: string) => {
      dispatch(removeLayer(layerId));
    },
    toggleVisible: (layerId: string) => {
      dispatch(toggleLayerVisible(layerId));
    },
    enableShapeEditing: (layerId: string) => {
      dispatch(updateEditLayer(layerId));
      dispatch(setDrawMode(DRAW_MODE.DRAW_SHAPES));
    },
    enablePointEditing: (layerId: string) => {
      dispatch(updateEditLayer(layerId));
      dispatch(setDrawMode(DRAW_MODE.DRAW_POINTS));
    },
    showThisLayerOnly: (layerId: string) => {
      dispatch(showThisLayerOnly(layerId));
    },
    ungroupLayer: (layerId: string) => {
      dispatch(ungroupLayer(layerId));
    },
  };
}

const connected = connect(mapStateToProps, mapDispatchToProps)(TOCEntryActionsPopover);
export { connected as TOCEntryActionsPopover };
