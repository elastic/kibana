/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { connect } from 'react-redux';
import { TOCEntry, OwnProps, ReduxDispatchProps, ReduxStateProps } from './toc_entry';
import { MapStoreState } from '../../../../../reducers/store';
import { FLYOUT_STATE } from '../../../../../reducers/ui';
import {
  getMapZoom,
  hasDirtyState,
  getSelectedLayer,
  getEditState,
} from '../../../../../selectors/map_selectors';
import {
  getIsReadOnly,
  getOpenTOCDetails,
  getFlyoutDisplay,
} from '../../../../../selectors/ui_selectors';
import { getInspectorAdapters } from '../../../../../reducers/non_serializable_instances';
import {
  fitToLayerExtent,
  setSelectedLayer,
  updateFlyout,
  hideTOCDetails,
  showTOCDetails,
  toggleLayerVisible,
  setDrawMode,
  updateDrawState,
} from '../../../../../actions';
import { DRAW_MODE } from '../../../../../../common/constants';

function mapStateToProps(state: MapStoreState, ownProps: OwnProps): ReduxStateProps {
  const flyoutDisplay = getFlyoutDisplay(state);
  return {
    inspectorAdapters: getInspectorAdapters(state),
    isReadOnly: getIsReadOnly(state),
    zoom: getMapZoom(state),
    selectedLayer: getSelectedLayer(state),
    hasDirtyStateSelector: hasDirtyState(state),
    isLegendDetailsOpen: getOpenTOCDetails(state).includes(ownProps.layer.getId()),
    isEditButtonDisabled:
      flyoutDisplay !== FLYOUT_STATE.NONE && flyoutDisplay !== FLYOUT_STATE.LAYER_PANEL,
    isFeatureEditorOpenForLayer: getEditState(state)?.layerId === ownProps.layer.getId(),
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    fitToBounds: (layerId: string) => {
      dispatch(fitToLayerExtent(layerId));
    },
    openLayerPanel: async (layerId: string) => {
      await dispatch(setSelectedLayer(layerId));
      dispatch(updateFlyout(FLYOUT_STATE.LAYER_PANEL));
    },
    hideTOCDetails: (layerId: string) => {
      dispatch(hideTOCDetails(layerId));
    },
    showTOCDetails: (layerId: string) => {
      dispatch(showTOCDetails(layerId));
    },
    toggleVisible: (layerId: string) => {
      dispatch(toggleLayerVisible(layerId));
    },
    cancelEditing: () => {
      dispatch(updateDrawState(null));
      dispatch(setDrawMode(DRAW_MODE.NONE));
    },
  };
}

const connected = connect<ReduxStateProps, ReduxDispatchProps, OwnProps, MapStoreState>(
  mapStateToProps,
  mapDispatchToProps
)(TOCEntry);
export { connected as TOCEntry };
