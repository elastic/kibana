import _ from 'lodash';
import { SearchSourceProvider } from 'ui/courier/data_source/search_source';
import { VisRequestHandlersRegistryProvider } from 'ui/registry/vis_request_handlers';
import { OtherBucketHelperProvider } from './other_bucket_helper';

const CourierRequestHandlerProvider = function (Private, courier, timefilter) {
  const SearchSource = Private(SearchSourceProvider);
  const { buildOtherBucketAgg, mergeOtherBucketAggResponse } = Private(OtherBucketHelperProvider);
  return {
    name: 'courier',
    handler: function (vis, appState, uiState, queryFilter, searchSource) {


      if (queryFilter && vis.editorMode) {
        searchSource.set('filter', queryFilter.getFilters());
        searchSource.set('query', appState.query);
      }

      const shouldQuery = () => {
        if (!searchSource.lastQuery || vis.reload) return true;
        if (!_.isEqual(_.cloneDeep(searchSource.get('filter')), searchSource.lastQuery.filter)) return true;
        if (!_.isEqual(_.cloneDeep(searchSource.get('query')), searchSource.lastQuery.query)) return true;
        if (!_.isEqual(_.cloneDeep(searchSource.get('aggs')()), searchSource.lastQuery.aggs)) return true;
        if (!_.isEqual(_.cloneDeep(timefilter.time), searchSource.lastQuery.time)) return true;

        return false;
      };

      return new Promise(async (resolve, reject) => {
        if (shouldQuery()) {
          delete vis.reload;
          searchSource.onResults().then(async resp => {
            searchSource.lastQuery = {
              filter: _.cloneDeep(searchSource.get('filter')),
              query: _.cloneDeep(searchSource.get('query')),
              aggs: _.cloneDeep(searchSource.get('aggs')()),
              time: _.cloneDeep(timefilter.time)
            };

            searchSource.rawResponse = resp;

            resolve(_.cloneDeep(resp));
          }).catch(e => reject(e));

          courier.fetch();
        } else {
          resolve(_.cloneDeep(searchSource.rawResponse));
        }
      }).then(async resp => {
        // walk over the aggregation list, looking for a term agg with other bucket turned on
        // todo: extract the below code to terms agg ... here we should look for any agg that requires a post flight req
        // and then call that aggs post-flight method to do what happens in the promise.all below
        const needsOtherBucket = _.filter(vis.aggs, agg => agg.type.name === 'terms' && agg.params.otherBucket);

        for (let i = 0; i < needsOtherBucket.length; i++) {
          const agg = needsOtherBucket[i];

          // for each of those we'll need to run one extra request
          const nestedSearchSource = new SearchSource().inherits(searchSource);

          const filterAgg = buildOtherBucketAgg(vis.aggs, searchSource.get('aggs')(), agg, resp);
          nestedSearchSource.set('aggs', filterAgg);

          //console.log(JSON.stringify(filterAgg()));

          // and we merge the response into the original one
          const response = await nestedSearchSource.fetchAsRejectablePromise();
          mergeOtherBucketAggResponse(vis.aggs, resp, response, agg, filterAgg());
        }

        return resp;
      });
    }
  };
};

VisRequestHandlersRegistryProvider.register(CourierRequestHandlerProvider);

export { CourierRequestHandlerProvider };
