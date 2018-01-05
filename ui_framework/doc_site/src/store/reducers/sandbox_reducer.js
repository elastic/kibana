import ActionTypes from '../../actions/action_types';

const defaultState = {
  isSandbox: false,
};

export default function sandboxReducer(state = defaultState, action) {
  switch (action.type) {
    case ActionTypes.OPEN_SANDBOX: {
      return {
        ...state,
        isSandbox: true,
      };
    }

    case ActionTypes.CLOSE_SANDBOX: {
      return {
        ...state,
        isSandbox: false,
      };
    }

    default:
      break;
  }

  return state;
}
