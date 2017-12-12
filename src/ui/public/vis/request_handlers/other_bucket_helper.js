import _ from 'lodash';
import { VisAggConfigProvider } from 'ui/vis/agg_config';
import { migrateFilter } from 'ui/courier/data_source/_migrate_filter';

const getAggConfig = (aggs, aggWithOtherBucket) => {
  if (aggs[aggWithOtherBucket.id]) return aggs[aggWithOtherBucket.id];
  return getAggConfig(_.values(aggs)[0].aggs, aggWithOtherBucket);
};

const getAggResultBuckets = (aggsConfig, response, aggWithOtherBucket, key) => {
  const keyParts = key.split('-');
  let responseAgg = response;
  for (const i in keyParts) {
    if (keyParts[i]) {
      const agg = _.values(responseAgg)[0];
      const aggKey = _.keys(responseAgg)[0];
      const aggConfig = _.find(aggsConfig, agg => agg.id === aggKey);
      const bucket = _.find(agg.buckets, (bucket, bucketObjKey) => {
        const bucketKey = aggConfig.getKey(bucket, Number.isInteger(bucketObjKey) ? null : bucketObjKey).toString();
        return bucketKey === keyParts[i];
      });
      if (bucket) {
        responseAgg = bucket;
      }
    }
  }
  if (responseAgg[aggWithOtherBucket.id]) return responseAgg[aggWithOtherBucket.id].buckets;
  return [];
};


export const OtherBucketHelperProvider = (Private) => {
  const AggConfig = Private(VisAggConfigProvider);

  const buildOtherBucketAgg = (aggsConfig, aggs, aggWithOtherBucket, response) => {
    const bucketAggs = aggsConfig.filter(agg => agg.type.type === 'buckets');
    const index = bucketAggs.findIndex(agg => agg.id === aggWithOtherBucket.id);

    // create filters aggregation
    const filterAgg = new AggConfig(aggsConfig[index].vis, {
      type: 'filters',
      id: 'other',
      schema: {
        group: 'buckets'
      }
    });

    // nest all the child aggregations of aggWithOtherBucket
    const filterAggDsl = filterAgg.toDsl();
    const resultAgg = {
      aggs: getAggConfig(aggs, aggWithOtherBucket).aggs,
      filters: filterAggDsl
    };

    // create filters for all parent aggregation buckets
    const walkBucketTree = (aggIndex, aggs, aggId, filters, key) => {
      const agg = aggs[aggId];
      const newAggIndex = aggIndex + 1;
      const newAgg = bucketAggs[newAggIndex];
      const currentAgg = bucketAggs[aggIndex];
      if (aggIndex < index) {
        _.each(agg.buckets, (bucket, bucketObjKey) => {
          const bucketKey = currentAgg.getKey(bucket, Number.isInteger(bucketObjKey) ? null : bucketObjKey);
          const filter = bucket.filter || currentAgg.createFilter(bucketKey);
          delete filter.meta;
          const migratedFilter = migrateFilter(filter.query || filter);
          const newFilters = [...filters, migratedFilter];
          walkBucketTree(newAggIndex, bucket, newAgg.id, newFilters, `${key}-${bucketKey.toString()}`);
        });
        return;
      }

      filterAggDsl.filters[key] = {
        bool: { must: filters, must_not: [ { terms: {} } ] }
      };

      // create not filters for all the buckets
      const notKeys = agg.buckets.map(bucket => bucket.key);
      filterAggDsl.filters[key].bool.must_not[0].terms[aggWithOtherBucket.params.field.name] = notKeys;

    };
    walkBucketTree(0, response.aggregations, bucketAggs[0].id, [], '');

    return () => {
      return {
        'other-filter': resultAgg
      };
    };
  };

  const mergeOtherBucketAggResponse = (aggsConfig, response, otherResponse, otherAgg, requestAgg) => {
    _.each(otherResponse.aggregations['other-filter'].buckets, (bucket, key) => {
      const bucketKey = key.replace(/^-/, '');
      const aggResultBuckets = getAggResultBuckets(aggsConfig, response.aggregations, otherAgg, bucketKey);
      const requestFilter = requestAgg['other-filter'].filters.filters[key];

      const generateFilter = (requestFilter) => {
        const termsInRequestFilter = requestFilter.bool.must_not[0].terms[otherAgg.params.field.name].length;
        return {
          meta: {
            filterId: otherAgg.params.field.name,
            alias: `not top ${termsInRequestFilter} ${otherAgg.params.field.name} terms`,
            index: otherAgg.params.field.indexPattern.id
          },
          query: requestFilter,
        };
      };

      const updateFilter = (newFilter, existingFilter) => {
        const mergedFilterQuery = _.cloneDeep(newFilter.query);
        mergedFilterQuery.bool.must_not[0].terms[otherAgg.params.field.name] = [
          ...newFilter.bool.must_not[0].terms[otherAgg.params.field.name],
          ...existingFilter.bool.must_not[0].terms[otherAgg.params.field.name]
        ];
        const mergedFilter = generateFilter(mergedFilterQuery);
        mergedFilter.updateFilter = updateFilter;
      };

      bucket.filter = generateFilter(requestFilter);
      bucket.filter.updateFilter = updateFilter;
      bucket.key = otherAgg.params.otherBucketLabel;
      aggResultBuckets.push(bucket);
    });
  };

  return { buildOtherBucketAgg, mergeOtherBucketAggResponse };
};
