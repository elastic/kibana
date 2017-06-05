import { LOCATION_CHANGE } from 'react-router-redux';

import ActionTypes from '../../actions/action_types';

const defaultState = {
  isOpen: false,
  codesBySlug: {},
  source: undefined,
  title: undefined,
};

export default function codeViewerReducer(state = defaultState, action) {
  switch (action.type) {
    case ActionTypes.OPEN_CODE_VIEWER: {
      const { source, title } = action;

      if (state.code === source) {
        // If we are opening the existing code, then close the viewer.
        return Object.assign({}, state, {
          isOpen: false,
          source: undefined,
          title: undefined,
        });
      }

      return Object.assign({}, state, {
        isOpen: true,
        source,
        title,
      });
    }

    case LOCATION_CHANGE: // Close Code Viewer when we navigate somewhere.
    case ActionTypes.CLOSE_CODE_VIEWER: {
      return Object.assign({}, state, {
        isOpen: false,
        source: undefined,
      });
    }

    default:
      break;
  }

  return state;
}
