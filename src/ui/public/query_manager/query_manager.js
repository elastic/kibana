export function QueryManagerProvider() {

  return function (state) {

    function getQuery() {
      return {
        ...state.query
      };
    }

    function updateQuery(newQuery) {
      state.query = newQuery;
    }

    return {
      getQuery,
      updateQuery,
    };

  };
}
