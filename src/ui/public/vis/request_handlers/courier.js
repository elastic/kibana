import _ from 'lodash';
import { SearchSourceProvider } from 'ui/courier/data_source/search_source';
import { VisRequestHandlersRegistryProvider } from 'ui/registry/vis_request_handlers';

const CourierRequestHandlerProvider = function (Private, courier, timefilter) {
  const SearchSource = Private(SearchSourceProvider);

  return {
    name: 'courier',
    handler: function (vis, appState, uiState, queryFilter, searchSource) {


      if (queryFilter && vis.editorMode) {
        searchSource.set('filter', queryFilter.getFilters());
        searchSource.set('query', appState.query);
      }

      // AggConfig contains circular reference to vis, which contains visualization parameters,
      // which we should not look at
      const copyAggs = (aggs) => {
        return aggs.map(agg => {
          return {
            type: agg.type,
            params: agg.params
          };
        });
      };

      const shouldQuery = () => {
        if (!searchSource.lastQuery || vis.reload) return true;
        if (!_.isEqual(_.cloneDeep(searchSource.get('filter')), searchSource.lastQuery.filter)) return true;
        if (!_.isEqual(_.cloneDeep(searchSource.get('query')), searchSource.lastQuery.query)) return true;
        if (!_.isEqual(_.cloneDeep(copyAggs(vis.aggs)), searchSource.lastQuery.aggs)) return true;
        if (!_.isEqual(_.cloneDeep(timefilter.time), searchSource.lastQuery.time)) return true;

        return false;
      };

      return new Promise((resolve, reject) => {
        if (shouldQuery()) {
          delete vis.reload;
          searchSource.onResults().then(resp => {
            searchSource.lastQuery = {
              filter: _.cloneDeep(searchSource.get('filter')),
              query: _.cloneDeep(searchSource.get('query')),
              aggs: _.cloneDeep(copyAggs(vis.aggs)),
              time: _.cloneDeep(timefilter.time)
            };

            searchSource.rawResponse = resp;

            return _.cloneDeep(resp);
          }).then(async resp => {
            for (const agg of vis.aggs) {
              const nestedSearchSource = new SearchSource().inherits(searchSource);
              resp = await agg.type.postFlightRequest(resp, vis.aggs, agg, nestedSearchSource);
            }

            searchSource.finalResponse = resp;
            resolve(resp);
          }).catch(e => reject(e));

          courier.fetch();
        } else {
          resolve(_.cloneDeep(searchSource.finalResponse));
        }
      });
    }
  };
};

VisRequestHandlersRegistryProvider.register(CourierRequestHandlerProvider);

export { CourierRequestHandlerProvider };
