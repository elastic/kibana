/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { getMapsCapabilities } from '../kibana_services';

import {
  UPDATE_FLYOUT,
  SET_IS_LAYER_TOC_OPEN,
  SET_IS_TIME_SLIDER_OPEN,
  SET_FULL_SCREEN,
  SET_READ_ONLY,
  SET_OPEN_TOC_DETAILS,
  SHOW_TOC_DETAILS,
  HIDE_TOC_DETAILS,
  SET_DRAW_MODE,
  SET_AUTO_OPEN_WIZARD_ID,
  PUSH_DELETED_FEATURE_ID,
  CLEAR_DELETED_FEATURE_IDS,
} from '../actions';
import { DRAW_MODE } from '../../common/constants';

export enum FLYOUT_STATE {
  NONE = 'NONE',
  LAYER_PANEL = 'LAYER_PANEL',
  ADD_LAYER_WIZARD = 'ADD_LAYER_WIZARD',
  MAP_SETTINGS_PANEL = 'MAP_SETTINGS_PANEL',
}

export type MapUiState = {
  flyoutDisplay: FLYOUT_STATE;
  drawMode: DRAW_MODE;
  isFullScreen: boolean;
  isReadOnly: boolean;
  isLayerTOCOpen: boolean;
  isTimesliderOpen: boolean;
  openTOCDetails: string[];
  autoOpenLayerWizardId: string;
  deletedFeatureIds: string[];
};

export const DEFAULT_IS_LAYER_TOC_OPEN = true;

export const DEFAULT_MAP_UI_STATE = {
  flyoutDisplay: FLYOUT_STATE.NONE,
  drawMode: DRAW_MODE.NONE,
  isFullScreen: false,
  isReadOnly: !getMapsCapabilities().save,
  isLayerTOCOpen: DEFAULT_IS_LAYER_TOC_OPEN,
  isTimesliderOpen: false,
  // storing TOC detail visibility outside of map.layerList because its UI state and not map rendering state.
  // This also makes for easy read/write access for embeddables.
  openTOCDetails: [],
  autoOpenLayerWizardId: '',
  deletedFeatureIds: [],
};

// Reducer
export function ui(state: MapUiState = DEFAULT_MAP_UI_STATE, action: any) {
  switch (action.type) {
    case UPDATE_FLYOUT:
      return { ...state, flyoutDisplay: action.display };
    case SET_DRAW_MODE:
      return { ...state, drawMode: action.drawMode };
    case SET_IS_LAYER_TOC_OPEN:
      return { ...state, isLayerTOCOpen: action.isLayerTOCOpen };
    case SET_IS_TIME_SLIDER_OPEN:
      return { ...state, isTimesliderOpen: action.isTimesliderOpen };
    case SET_FULL_SCREEN:
      return { ...state, isFullScreen: action.isFullScreen };
    case SET_READ_ONLY:
      return { ...state, isReadOnly: action.isReadOnly };
    case SET_OPEN_TOC_DETAILS:
      return { ...state, openTOCDetails: action.layerIds };
    case SHOW_TOC_DETAILS:
      return {
        ...state,
        openTOCDetails: [...state.openTOCDetails, action.layerId],
      };
    case HIDE_TOC_DETAILS:
      return {
        ...state,
        openTOCDetails: state.openTOCDetails.filter((layerId) => {
          return layerId !== action.layerId;
        }),
      };
    case SET_AUTO_OPEN_WIZARD_ID:
      return { ...state, autoOpenLayerWizardId: action.autoOpenLayerWizardId };
    case PUSH_DELETED_FEATURE_ID:
      return {
        ...state,
        deletedFeatureIds: [...state.deletedFeatureIds, action.featureId],
      };
    case CLEAR_DELETED_FEATURE_IDS:
      return {
        ...state,
        deletedFeatureIds: [],
      };
    default:
      return state;
  }
}
