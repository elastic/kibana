import _ from 'lodash';
import { VisAggConfigProvider } from 'ui/vis/agg_config';
import { migrateFilter } from 'ui/courier/data_source/_migrate_filter';

const getAggConfig = (aggs, aggWithOtherBucket) => {
  if (aggs[aggWithOtherBucket.id]) return aggs[aggWithOtherBucket.id];
  return getAggConfig(_.values(aggs)[0], aggWithOtherBucket);
};

const getAggResultBuckets = (aggsConfig, response, aggWithOtherBucket, key) => {
  const keyParts = key.split('-');
  let responseAgg = response;
  for (const i in keyParts) {
    if (keyParts[i]) {
      const agg = _.values(responseAgg)[0];
      const aggKey = _.keys(responseAgg)[0];
      const aggConfig = _.find(aggsConfig, agg => agg.id === aggKey);
      const bucket = _.find(agg.buckets, bucket => {
        const bucketKey = aggConfig.getKey(bucket).toString();
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
        _.each(agg.buckets, bucket => {
          const bucketKey = currentAgg.getKey(bucket);
          const filter = currentAgg.createFilter(bucketKey);
          delete filter.meta;
          const migratedFilter = migrateFilter(filter.query || filter);
          const newFilters = filters.concat([migratedFilter]);
          walkBucketTree(newAggIndex, bucket, newAgg.id, newFilters, `${key}-${bucketKey.toString()}`);
        });
        return;
      }

      filterAggDsl.filters[`${key}-other`] = {
        bool: { must: filters, must_not: [ { terms: {} } ] }
      };

      // check if missing bucket is enabled and add it to must filters
      if (aggs[`${aggId}-missing`]) {
        filterAggDsl.filters[`${key}-other`].bool.must.push({
          exists: {
            field: bucketAggs[index].params.field.name
          }
        });
      }

      // create not filters for all the buckets
      const notKeys = agg.buckets.map(bucket => bucket.key);
      filterAggDsl.filters[`${key}-other`].bool.must_not[0].terms[aggWithOtherBucket.params.field.name] = notKeys;

    };
    walkBucketTree(0, response.aggregations, bucketAggs[0].id, [], '');

    return () => {
      return {
        '0-filter': resultAgg
      };
    };
  };

  const mergeOtherBucketAggResponse = (aggsConfig, response, otherResponse, otherAgg, requestAgg) => {
    // insert new bucket
    _.each(otherResponse.aggregations['0-filter'].buckets, (bucket, key) => {
      // find the place where to insert
      const bucketKey = key.replace(/-other$/, '').replace(/^-/, '');
      const aggResultBuckets = getAggResultBuckets(aggsConfig, response.aggregations, otherAgg, bucketKey);
      const requestFilter = requestAgg['0-filter'].filters.filters[key];
      bucket.filter = requestFilter;
      bucket.key = otherAgg.params.otherBucketLabel;
      aggResultBuckets.push(bucket);
    });
  };

  return { buildOtherBucketAgg, mergeOtherBucketAggResponse };
};
