import _ from 'lodash';

const CourierRequestHandlerProvider = function (Private, courier, timefilter) {
  return {
    name: 'courier',
    handler: function (vis, appState, uiState, searchSource) {
      if (appState) {
        searchSource.set('filter', appState.filters);
        if (!appState.linked) searchSource.set('query', appState.query);
      }

      const shouldQuery = () => {
        if (!searchSource.lastQuery) return true;
        if (!_.isEqual(_.cloneDeep(searchSource.get('filter')), searchSource.lastQuery.filter)) return true;
        if (!_.isEqual(_.cloneDeep(searchSource.get('query')), searchSource.lastQuery.query)) return true;
        if (!_.isEqual(_.cloneDeep(searchSource.get('aggs')()), searchSource.lastQuery.aggs)) return true;
        if (!_.isEqual(_.cloneDeep(timefilter.time), searchSource.lastQuery.time)) return true;

        return false;
      };

      return new Promise((resolve, reject) => {
        if (shouldQuery()) {
          searchSource.onResults().then(resp => {
            searchSource.lastQuery = {
              filter: _.cloneDeep(searchSource.get('filter')),
              query: _.cloneDeep(searchSource.get('query')),
              aggs: _.cloneDeep(searchSource.get('aggs')()),
              time: _.cloneDeep(timefilter.time)
            };

            searchSource.rawResponse = resp;
            resolve(resp);
          }).catch(e => reject(e));

          searchSource.onError(e => {
            reject(e);
          }).catch(e => reject(e));

          courier.fetch();
        } else {
          resolve(searchSource.rawResponse);
        }


      });
    }
  };
};

export { CourierRequestHandlerProvider };
