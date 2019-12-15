/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const UPDATE_FLYOUT = 'UPDATE_FLYOUT';
export const CLOSE_SET_VIEW = 'CLOSE_SET_VIEW';
export const OPEN_SET_VIEW = 'OPEN_SET_VIEW';
export const SET_IS_LAYER_TOC_OPEN = 'SET_IS_LAYER_TOC_OPEN';
export const SET_FULL_SCREEN = 'SET_FULL_SCREEN';
export const SET_READ_ONLY = 'SET_READ_ONLY';
export const SET_OPEN_TOC_DETAILS = 'SET_OPEN_TOC_DETAILS';
export const SHOW_TOC_DETAILS = 'SHOW_TOC_DETAILS';
export const HIDE_TOC_DETAILS = 'HIDE_TOC_DETAILS';
export const UPDATE_INDEXING_STAGE = 'UPDATE_INDEXING_STAGE';

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
export function exitFullScreen() {
  return {
    type: SET_FULL_SCREEN,
    isFullScreen: false,
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
