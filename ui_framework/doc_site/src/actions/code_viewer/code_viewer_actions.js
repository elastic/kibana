
import ActionTypes from '../action_types';

export default {

  openCodeViewer: slug => ({
    type: ActionTypes.OPEN_CODE_VIEWER,
    slug,
  }),

  updateCodeViewer: slug => ({
    type: ActionTypes.UPDATE_CODE_VIEWER,
    slug,
  }),

  closeCodeViewer: () => ({
    type: ActionTypes.CLOSE_CODE_VIEWER,
  }),

  registerCode: code => ({
    type: ActionTypes.REGISTER_CODE,
    code,
  }),

  unregisterCode: code => ({
    type: ActionTypes.UNREGISTER_CODE,
    code
  }),

};
