/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  UPDATE_FLYOUT,
  CLOSE_SET_VIEW,
  OPEN_SET_VIEW,
  SET_IS_LAYER_TOC_OPEN,
  SET_FULL_SCREEN,
  SET_READ_ONLY,
  SET_OPEN_TOC_DETAILS,
  SHOW_TOC_DETAILS,
  HIDE_TOC_DETAILS,
  UPDATE_INDEXING_STAGE,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../plugins/maps/public/actions/ui_actions';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
export * from '../../../../../plugins/maps/public/actions/ui_actions';

export function exitFullScreen() {
  return {
    type: SET_FULL_SCREEN,
    isFullScreen: false,
  };
}

export function updateFlyout(display) {
  return {
    type: UPDATE_FLYOUT,
    display,
  };
}
export function closeSetView() {
  return {
    type: CLOSE_SET_VIEW,
  };
}
export function openSetView() {
  return {
    type: OPEN_SET_VIEW,
  };
}
export function setIsLayerTOCOpen(isLayerTOCOpen) {
  return {
    type: SET_IS_LAYER_TOC_OPEN,
    isLayerTOCOpen,
  };
}
export function enableFullScreen() {
  return {
    type: SET_FULL_SCREEN,
    isFullScreen: true,
  };
}
export function setReadOnly(isReadOnly) {
  return {
    type: SET_READ_ONLY,
    isReadOnly,
  };
}

export function setOpenTOCDetails(layerIds) {
  return {
    type: SET_OPEN_TOC_DETAILS,
    layerIds,
  };
}

export function showTOCDetails(layerId) {
  return {
    type: SHOW_TOC_DETAILS,
    layerId,
  };
}

export function hideTOCDetails(layerId) {
  return {
    type: HIDE_TOC_DETAILS,
    layerId,
  };
}

export function updateIndexingStage(stage) {
  return {
    type: UPDATE_INDEXING_STAGE,
    stage,
  };
}
