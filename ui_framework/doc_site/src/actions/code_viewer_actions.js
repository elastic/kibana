import ActionTypes from './action_types';

export default {
  openCodeViewer: source => ({
    type: ActionTypes.OPEN_CODE_VIEWER,
    source,
  }),

  closeCodeViewer: () => ({
    type: ActionTypes.CLOSE_CODE_VIEWER,
  }),
};
