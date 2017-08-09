import ActionTypes from './action_types';

export const openSandbox = () => ({
  type: ActionTypes.OPEN_SANDBOX,
});

export const closeSandbox = () => ({
  type: ActionTypes.CLOSE_SANDBOX,
});
