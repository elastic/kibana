import ActionTypes from './action_types';

export default {
  registerSection: (id, name) => ({
    type: ActionTypes.REGISTER_SECTION,
    id,
    name,
  }),

  unregisterSection: id => ({
    type: ActionTypes.UNREGISTER_SECTION,
    id,
  }),
};
