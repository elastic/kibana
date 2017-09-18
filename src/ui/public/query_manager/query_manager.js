import _ from 'lodash';

export function queryManagerFactory(state) {

  function getQuery() {
    return {
      ...state.query
    };
  }

  function updateQuery(newQuery) {
    state.query = newQuery;

    if (_.isFunction(state.save)) {
      state.save();
    }
  }

  return {
    getQuery,
    updateQuery,
  };

}
