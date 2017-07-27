import _ from 'lodash';
import { VisResponseHandlersRegistryProvider } from 'ui/registry/vis_response_handlers';

const HierarchicalResponseHandlerProvider = function () {
  /***
   * Prepares series out of esResponse.
   * each combination of metric, segment bucket and group bucket will add a series
   * each split bucket will create multiple charts
   *
   * @param vis
   * @param esResponse
   */
  return {
    name: 'hierarchical_data',
    handler: (vis, esResponse) => {

      const metrics = vis.aggs.filter(agg => agg.schema.group === 'metrics');
      const buckets = vis.aggs.filter(agg => agg.schema.group === 'buckets');
      const lastBucket = _.last(buckets);

      const charts = {};
      const getValues = (data, aggs = []) => {
        const getValue = (metric) => {
          if (metric.type.name === 'count') return data.doc_count;
          if (data[metric.id].value) return data[metric.id].value;
          if (data[metric.id].values) {
            if (data[metric.id].values.length && !isNaN(data[metric.id].values[0].value)) {
              return data[metric.id].values[0].value;
            }
          }
          return 0;
        };

        return metrics.map(metric => {
          const newAggs = aggs.concat({
            id: metric.id,
            label: metric.makeLabel(),
            formatter: metric.fieldFormatter('text'),
            value: getValue(metric)
          });

          return {
            aggs: newAggs.slice().reverse(),
            value: getValue(metric)
          };
        });
      };

      const getSlices = (data, chart, aggs = [], done = false) => {
        if (done) return;
        _.map(data, (agg, id) => {
          if (!_.isObject(agg)) return;
          const aggConfig = vis.aggs.find(agg => agg.id === id);
          if (!aggConfig) throw 'undefined aggregation while converting series data';

          if (aggConfig.schema.name === 'split') {
            agg.buckets.forEach(bucket => {
              if (!charts[bucket.key]) {
                charts[bucket.key] = {
                  label: bucket.key + ': ' + aggConfig.makeLabel(bucket.key),
                  children: []
                };
              }
              chart = charts[bucket.key];
              const newAggs = aggs.concat({
                id: aggConfig.id,
                label: aggConfig.makeLabel(),
                value: aggConfig.fieldFormatter('html')(bucket.key),
                rawValue: bucket.key
              });
              return getSlices(bucket, chart, newAggs, id === lastBucket.id);
            });
          } else if (aggConfig.schema.group === 'buckets') {
            if (!chart) {
              charts[0] = { label: aggConfig.makeLabel(), children: [] };
              chart = charts[0];
            }
            agg.buckets.forEach(bucket => {
              const newAggs = aggs.concat({
                id: aggConfig.id,
                label: aggConfig.makeLabel(),
                value: aggConfig.fieldFormatter('html')(bucket.key),
                rawValue: bucket.key
              });
              const slice = {
                label: bucket.key,
                aggs: newAggs.slice().reverse(),
                values: getValues(bucket, newAggs),
                children: []
              };
              chart.children.push(slice);
              return getSlices(bucket, slice, newAggs, id === lastBucket.id);
            });
          }
        });
      };

      let result;
      if (buckets.length === 0) {
        if (metrics.length > 1 || metrics[0].type.name !== 'count') {
          esResponse.aggregations.doc_count = esResponse.hits.total;
          result = {
            charts: [
              {
                label: '',
                children: [
                  {
                    values: getValues(esResponse)
                  }
                ]
              }
            ]
          };
        } else {
          result = {
            charts: [{
              label: 'All',
              children: [{
                label: 'Count',
                aggs: [{ label: 'Count', value: esResponse.hits.total }],
                values: [{
                  id: metrics[0].id,
                  label: metrics[0].makeLabel(),
                  formatter: metrics[0].fieldFormatter('text'),
                  value: esResponse.hits.total
                }]
              }]
            }]
          };
        }
      } else {
        getSlices(esResponse.aggregations, 0);
        result = {
          charts: _.map(charts, chart => {
            chart.children = _.values(chart.children);
            return chart;
          })
        };
      }

      result.hits = esResponse.hits.total;

      return Promise.resolve(result);
    }
  };
};

VisResponseHandlersRegistryProvider.register(HierarchicalResponseHandlerProvider);

export { HierarchicalResponseHandlerProvider };
