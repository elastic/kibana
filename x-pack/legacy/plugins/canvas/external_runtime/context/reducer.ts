/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExternalEmbedState } from './state';
import { ExternalEmbedAction, ExternalEmbedActions } from './actions';

/**
 * The Action Reducer for the Embedded Canvas Workpad interface.
 */
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

      return {
        ...state,
        footer: {
          ...footer,
          isScrubberVisible: action.payload.visible,
        },
      };
    }
    case ExternalEmbedActions.SET_AUTOPLAY: {
      const { settings } = state;
      const { autoplay } = settings;

      return {
        ...state,
        settings: {
          ...settings,
          autoplay: {
            ...autoplay,
            enabled: action.payload.autoplay,
          },
        },
      };
    }
    case ExternalEmbedActions.SET_AUTOPLAY_ANIMATE: {
      const { settings } = state;
      const { autoplay } = settings;
      const { animate } = action.payload;

      return {
        ...state,
        settings: {
          ...settings,
          autoplay: {
            ...autoplay,
            animate,
          },
        },
      };
    }
    case ExternalEmbedActions.SET_AUTOPLAY_INTERVAL: {
      const { settings } = state;
      const { autoplay } = settings;
      const { interval } = action.payload;

      return {
        ...state,
        settings: {
          ...settings,
          autoplay: {
            ...autoplay,
            interval,
          },
        },
      };
    }
    case ExternalEmbedActions.SET_TOOLBAR_AUTOHIDE: {
      const { settings } = state;
      const { toolbar } = settings;
      const { autohide } = action.payload;

      return {
        ...state,
        settings: {
          ...settings,
          toolbar: {
            ...toolbar,
            autohide,
          },
        },
      };
    }
    default: {
      return state;
    }
  }
};
