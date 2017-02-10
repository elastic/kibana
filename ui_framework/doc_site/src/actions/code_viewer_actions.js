import ActionTypes from './action_types';

export const openCodeViewer = source => ({
  type: ActionTypes.OPEN_CODE_VIEWER,
  source,
});

export const closeCodeViewer = () => ({
  type: ActionTypes.CLOSE_CODE_VIEWER,
});
