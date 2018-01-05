import _ from 'lodash';

export function queryManagerFactory(getState) {

  function getQuery() {
    return {
      ...getState().query
    };
  }

  function setQuery(newQuery) {
    const state = getState();
    state.query = newQuery;

    if (_.isFunction(state.save)) {
      state.save();
    }
  }

  return {
    getQuery,
    setQuery,
  };

}
