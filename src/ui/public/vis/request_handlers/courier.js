import _ from 'lodash';
import { SearchSourceProvider } from '../../courier/data_source/search_source';
import { VisRequestHandlersRegistryProvider } from '../../registry/vis_request_handlers';
import { calculateObjectHash } from '../lib/calculate_object_hash';

const CourierRequestHandlerProvider = function (Private, courier, timefilter) {
  const SearchSource = Private(SearchSourceProvider);

  /**
   * TODO: This code can be removed as soon as we got rid of inheritance in the
   * searchsource and pass down every filter explicitly.
   * We are filtering out the global timefilter by the meta key set by the root
   * search source on that filter.
   */
  function removeSearchSourceParentTimefilter(searchSource) {
    searchSource.addFilterPredicate((filter) => {
      return !_.get(filter, 'meta._globalTimefilter', false);
    });
  }

  return {
    name: 'courier',
    handler: function (vis, { appState, queryFilter, searchSource, timeRange }) {

      // Create a new search source that inherits the original search source
      // but has the propriate timeRange applied via a filter.
      // This is a temporary solution until we properly pass down all required
      // information for the request to the request handler (https://github.com/elastic/kibana/issues/16641).
      // Using callParentStartHandlers: true we make sure, that the parent searchSource
      // onSearchRequestStart will be called properly even though we use an inherited
      // search source.
      const requestSearchSource = new SearchSource().inherits(searchSource, { callParentStartHandlers: true });

      // For now we need to mirror the history of the passed search source, since
      // the spy panel wouldn't work otherwise.
      Object.defineProperty(requestSearchSource, 'history', {
        get() {
          return requestSearchSource._parent.history;
        },
        set(history) {
          return requestSearchSource._parent.history = history;
        }
      });

      requestSearchSource.aggs(function () {
        return vis.getAggConfig().toDsl();
      });

      requestSearchSource.onRequestStart((searchSource, searchRequest) => {
        return vis.onSearchRequestStart(searchSource, searchRequest);
      });

      // Add the explicit passed timeRange as a filter to the requestSearchSource.
      requestSearchSource.filter(() => {
        return timefilter.get(searchSource.get('index'), timeRange);
      });

      removeSearchSourceParentTimefilter(requestSearchSource);

      if (queryFilter && vis.editorMode) {
        searchSource.set('filter', queryFilter.getFilters());
        searchSource.set('query', appState.query);
      }

      const shouldQuery = () => {
        if (!searchSource.lastQuery || vis.reload) return true;
        if (!_.isEqual(_.cloneDeep(searchSource.get('filter')), searchSource.lastQuery.filter)) return true;
        if (!_.isEqual(_.cloneDeep(searchSource.get('query')), searchSource.lastQuery.query)) return true;
        if (!_.isEqual(calculateObjectHash(vis.getAggConfig()), searchSource.lastQuery.aggs)) return true;
        if (!_.isEqual(_.cloneDeep(timeRange), searchSource.lastQuery.timeRange)) return true;

        return false;
      };

      return new Promise((resolve, reject) => {
        if (shouldQuery()) {
          delete vis.reload;
          requestSearchSource.onResults().then(resp => {
            searchSource.lastQuery = {
              filter: _.cloneDeep(searchSource.get('filter')),
              query: _.cloneDeep(searchSource.get('query')),
              aggs: calculateObjectHash(vis.getAggConfig()),
              timeRange: _.cloneDeep(timeRange)
            };

            searchSource.rawResponse = resp;

            return _.cloneDeep(resp);
          }).then(async resp => {
            for (const agg of vis.getAggConfig()) {
              if (_.has(agg, 'type.postFlightRequest')) {
                const nestedSearchSource = new SearchSource().inherits(requestSearchSource);
                resp = await agg.type.postFlightRequest(resp, vis.aggs, agg, nestedSearchSource);
              }
            }

            searchSource.finalResponse = resp;
            resolve(resp);
          }).catch(e => reject(e));

          courier.fetch();
        } else {
          resolve(searchSource.finalResponse);
        }
      });
    }
  };
};

VisRequestHandlersRegistryProvider.register(CourierRequestHandlerProvider);

export { CourierRequestHandlerProvider };
