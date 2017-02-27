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

    case ActionTypes.UPDATE_CODE_VIEWER: {
      if (state.isOpen) {
        return Object.assign({}, state, {
          source: state.codesBySlug[action.slug],
        });
      }
      return state;
    }

    case ActionTypes.CLOSE_CODE_VIEWER: {
      return Object.assign({}, state, {
        isOpen: false,
        source: undefined,
      });
    }

    case ActionTypes.REGISTER_CODE: {
      const codesBySlug = Object.assign({}, state.codesBySlug, {
        [action.code.slug]: action.code,
      });

      return Object.assign({}, state, {
        codesBySlug
      });
    }

    case ActionTypes.UNREGISTER_CODE: {
      const codesBySlug = Object.assign({}, state.codesBySlug);
      delete codesBySlug[action.code.slug];

      return Object.assign({}, state, {
        codesBySlug
      });
    }

    default:
      break;
  }

  return state;
}
