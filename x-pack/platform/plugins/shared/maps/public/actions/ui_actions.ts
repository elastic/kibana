/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';
import type { MapStoreState } from '../reducers/store';
import {
  getFlyoutDisplay,
  getFlyoutOpenTriggerElement,
  getOpenTOCDetails,
} from '../selectors/ui_selectors';
import { FLYOUT_STATE } from '../reducers/ui';
import { setQuery, trackMapSettings } from './map_actions';
import { setSelectedLayer } from './layer_actions';
import { DRAW_MODE } from '../../common/constants';
import { UPDATE_EDIT_STATE } from './map_action_constants';
import { getSelectedLayerId } from '../selectors/map_selectors';

export const UPDATE_FLYOUT = 'UPDATE_FLYOUT';
export const SET_IS_LAYER_TOC_OPEN = 'SET_IS_LAYER_TOC_OPEN';
export const SET_IS_TIME_SLIDER_OPEN = 'SET_IS_TIME_SLIDER_OPEN';
export const SET_FULL_SCREEN = 'SET_FULL_SCREEN';
export const SET_READ_ONLY = 'SET_READ_ONLY';
export const SET_OPEN_TOC_DETAILS = 'SET_OPEN_TOC_DETAILS';
export const SHOW_TOC_DETAILS = 'SHOW_TOC_DETAILS';
export const HIDE_TOC_DETAILS = 'HIDE_TOC_DETAILS';
export const SET_DRAW_MODE = 'SET_DRAW_MODE';
export const SET_AUTO_OPEN_WIZARD_ID = 'SET_AUTO_OPEN_WIZARD_ID';
export const PUSH_DELETED_FEATURE_ID = 'PUSH_DELETED_FEATURE_ID';
export const CLEAR_DELETED_FEATURE_IDS = 'CLEAR_DELETED_FEATURE_IDS';
export const SET_FLYOUT_OPEN_TRIGGER_ELEMENT = 'SET_FLYOUT_OPEN_TRIGGER_ELEMENT';

export function exitFullScreen() {
  return {
    type: SET_FULL_SCREEN,
    isFullScreen: false,
  };
}

export function updateFlyout(display: FLYOUT_STATE) {
  return (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    switch (display) {
      case FLYOUT_STATE.NONE:
        const triggerElement = getFlyoutOpenTriggerElement(getState());
        dispatch({
          type: SET_FLYOUT_OPEN_TRIGGER_ELEMENT,
          flyoutOpenTriggerElement: null,
        });
        // Return focus to the button used to open this flyout
        if (triggerElement) {
          const prevFlyoutState = getFlyoutDisplay(getState());
          if (prevFlyoutState === FLYOUT_STATE.LAYER_PANEL) {
            // If previous flyout state was the edit panel, flyout was triggered by a hover action that's now hidden,
            // so locate its enclosing layerName and focus the popover button
            const layerTocEntry =
              (triggerElement
                .closest('[data-layerid]')
                ?.querySelector('button.mapTocEntry__layerName') as HTMLButtonElement) ?? null;

            requestAnimationFrame(() => {
              // First focus the enclosing layerName
              layerTocEntry?.focus();
              // Wait for the original edit button to reappear, then shift focus to it
              requestAnimationFrame(() => triggerElement.focus());
            });
          } else {
            // Wait for rendering to finish to ensure focusable elements are all re-enabled
            requestAnimationFrame(() => triggerElement.focus());
          }
        }
        dispatch({
          type: UPDATE_FLYOUT,
          display,
        });
        break;
      case FLYOUT_STATE.LAYER_PANEL:
        const selectedLayerId = getSelectedLayerId(getState());
        dispatch({
          type: SET_FLYOUT_OPEN_TRIGGER_ELEMENT,
          flyoutOpenTriggerElement: document.querySelector(
            `[data-layerid="${selectedLayerId}"] button[data-edit-button]`
          ),
        });
        break;
      default:
        dispatch({
          type: SET_FLYOUT_OPEN_TRIGGER_ELEMENT,
          flyoutOpenTriggerElement: document.activeElement,
        });
        break;
    }
  };
}
export function openMapSettings() {
  return (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const flyoutDisplay = getFlyoutDisplay(getState());
    if (flyoutDisplay === FLYOUT_STATE.MAP_SETTINGS_PANEL) {
      return;
    }
    dispatch(setSelectedLayer(null));
    dispatch(trackMapSettings());
    dispatch(updateFlyout(FLYOUT_STATE.MAP_SETTINGS_PANEL));
  };
}
export function setIsLayerTOCOpen(isLayerTOCOpen: boolean) {
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
export function setReadOnly(isReadOnly: boolean) {
  return {
    type: SET_READ_ONLY,
    isReadOnly,
  };
}

export function setOpenTOCDetails(layerIds?: string[]) {
  return {
    type: SET_OPEN_TOC_DETAILS,
    layerIds,
  };
}

export function showTOCDetails(layerId: string) {
  return (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const openTOCDetails = getOpenTOCDetails(getState());
    if (openTOCDetails.includes(layerId)) {
      // details already open, nothing to do
      return;
    }

    dispatch({
      type: SHOW_TOC_DETAILS,
      layerId,
    });
  };
}

export function hideTOCDetails(layerId: string) {
  return {
    type: HIDE_TOC_DETAILS,
    layerId,
  };
}

export function setDrawMode(drawMode: DRAW_MODE) {
  return (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) => {
    if (drawMode === DRAW_MODE.NONE) {
      dispatch({
        type: UPDATE_EDIT_STATE,
        editState: undefined,
      });
    }
    dispatch({
      type: SET_DRAW_MODE,
      drawMode,
    });
  };
}

export function openTimeslider() {
  return {
    type: SET_IS_TIME_SLIDER_OPEN,
    isTimesliderOpen: true,
  };
}

export function closeTimeslider() {
  return (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) => {
    dispatch({
      type: SET_IS_TIME_SLIDER_OPEN,
      isTimesliderOpen: false,
    });
    dispatch(setQuery({ clearTimeslice: true }));
  };
}

export function setAutoOpenLayerWizardId(autoOpenLayerWizardId: string) {
  return (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) => {
    dispatch(setSelectedLayer(null));
    dispatch(updateFlyout(FLYOUT_STATE.ADD_LAYER_WIZARD));
    dispatch(setDrawMode(DRAW_MODE.NONE));
    dispatch({
      type: SET_AUTO_OPEN_WIZARD_ID,
      autoOpenLayerWizardId,
    });
  };
}

export function pushDeletedFeatureId(featureId: string) {
  return {
    type: PUSH_DELETED_FEATURE_ID,
    featureId,
  };
}

export function clearDeletedFeatureIds() {
  return {
    type: CLEAR_DELETED_FEATURE_IDS,
  };
}
