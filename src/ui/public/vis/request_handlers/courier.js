// request handler:
// handler function: a function that returns a promise
// promise returns response data when resolved
//import courier from 'ui/courier/fetch/fetch';

const CourierRequestHandlerProvider = function (Private, courier) {
  return {
    name: 'courier',
    handler: function (vis, appState, uiState, searchSource) {
      searchSource.set('filter', appState.filters);
      if (!appState.linked) searchSource.set('query', appState.query);

      return new Promise((resolve, reject) => {
        searchSource.onResults().then(resp => {
          resolve(resp);
        }).catch(e => reject(e));

        searchSource.onError(e => {
          reject(e);
        }).catch(e => reject(e));

        courier.fetch();
      });
    }
  };
};

export { CourierRequestHandlerProvider };
