/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExternalEmbedState } from './state';
import { ExternalEmbedAction, ExternalEmbedActions } from './actions';

export const reducer = (state: ExternalEmbedState, action: ExternalEmbedAction) => {
  switch (action.type) {
    case ExternalEmbedActions.SET_WORKPAD: {
      return {
        ...state,
        workpad: action.payload.workpad,
      };
    }
    case ExternalEmbedActions.SET_PAGE: {
      return {
        ...state,
        page: action.payload.page,
      };
    }
    case ExternalEmbedActions.SET_SCRUBBER_VISIBLE: {
      const { footer } = state;
      footer.isScrubberVisible = action.payload.visible;

      return {
        ...state,
        footer,
      };
    }
    case ExternalEmbedActions.SET_AUTOPLAY: {
      const { settings } = state;

      settings.autoplay.enabled = action.payload.autoplay;

      return {
        ...state,
        settings,
      };
    }
    case ExternalEmbedActions.SET_AUTOPLAY_ANIMATE: {
      const { settings } = state;

      settings.autoplay.animate = action.payload.animate;

      return {
        ...state,
        settings,
      };
    }
    case ExternalEmbedActions.SET_AUTOPLAY_INTERVAL: {
      const { settings } = state;

      settings.autoplay.interval = action.payload.interval;

      return {
        ...state,
        settings,
      };
    }
    case ExternalEmbedActions.SET_TOOLBAR_AUTOHIDE: {
      const { settings } = state;

      settings.toolbar.autohide = action.payload.autohide;

      return {
        ...state,
        settings,
      };
    }
    default: {
      return state;
    }
  }
};
