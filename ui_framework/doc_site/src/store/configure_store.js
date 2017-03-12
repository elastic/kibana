import {
  applyMiddleware,
  createStore,
  compose,
} from 'redux';
import thunk from 'redux-thunk';
import { browserHistory } from 'react-router';
import {
  routerMiddleware,
  routerReducer,
} from 'react-router-redux';

import codeViewerReducer from './reducers/code_viewer_reducer';
import sectionsReducer from './reducers/sections_reducer';

/**
 * @param {Object} initialState An object defining the application's initial
 * state.
 */
export default function configureStore(initialState) {
  function rootReducer(state = {}, action) {
    return {
      routing: routerReducer(state.routing, action),
      codeViewer: codeViewerReducer(state.codeViewer, action),
      sections: sectionsReducer(state.sections, action),
    };
  }

  const finalStore = compose(
    applyMiddleware(
      thunk,
      routerMiddleware(browserHistory)
    )
  )(createStore)(rootReducer, initialState);

  return finalStore;
}
