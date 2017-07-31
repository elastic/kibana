import _ from 'lodash';
import { VisResponseHandlersRegistryProvider } from 'ui/registry/vis_response_handlers';

const seriesResponseHandlerProvider = function () {
  /***
   * Prepares series out of esResponse.
   * each combination of metric, segment bucket and group bucket will add a series
   * each split bucket will create multiple charts
   *
   * @param vis
   * @param esResponse
   */
  return {
    name: 'series_data',
    handler: (vis, esResponse) => {

      const clonedResponse = _.cloneDeep(esResponse);

      const metrics = vis.aggs.filter(agg => agg.schema.group === 'metrics');
      const buckets = vis.aggs.filter(agg => agg.schema.group === 'buckets');
      const segment = vis.aggs.find(agg => agg.schema.name === 'segment');
      const radius = vis.aggs.find(agg => agg.schema.name === 'radius');
      const lastBucket = _.last(buckets);
      let chartSplit = 'column';
      let scale = 1;
      let xAxisFormatter;
      let yAxisFormatter;
      const charts = {};

      const getBucketKey = (aggConfig, bucket, key) => {
        let value = bucket.key || key;
        if (typeof bucket.from_as_string !== 'undefined') {
          const from = aggConfig.params.field.format.convert(bucket.from);
          const to = aggConfig.params.field.format.convert(bucket.to);
          value = `${from} to ${to}`;
        } else if (typeof bucket.from !== 'undefined') {
          value = aggConfig.fieldFormatter('text')({ gte: bucket.from, lt: bucket.to });
          if (typeof value === 'object') {
            value = `${value.gte} to ${value.lt}`;
          }
        } else {
          value = aggConfig.fieldFormatter('text')(value);
        }
        return value;
      };

      const getBucketRawKey = (aggConfig, bucket) => {
        let value = bucket.key;
        if (typeof bucket.from !== 'undefined') {
          value = { gte: bucket.from, lt: bucket.to };
        }
        return value;
      };

      const getBucketProps = (aggConfig, bucket, key) => {
        const value = getBucketKey(aggConfig, bucket, key);
        //const useRawValue = !['range', 'ip_range', 'date_range', 'filters'].includes(aggConfig.type.name);
        const useRawValue = !['ip_range', 'date_range'].includes(aggConfig.type.name);

        return {
          id: aggConfig.id,
          label: aggConfig.makeLabel(),
          value: value,
          rawValue: useRawValue ? getBucketRawKey(aggConfig, bucket) : null
        };
      };

      const sortBuckets = (aggConfig, buckets) => {
        if (['range', 'filters'].includes(aggConfig.type.name)) {
          const sortedBuckets = [];
          if (aggConfig.type.name === 'range') {
            aggConfig.params.ranges.forEach(range => {
              const key = _.findKey(buckets, bucket => bucket.from === range.from && bucket.to === range.to);
              buckets[key].key = key;
              sortedBuckets.push(buckets[key]);
            });
          } else if (aggConfig.type.name === 'filters') {
            aggConfig.params.filters.forEach(filter => {
              const key = filter.label || filter.input.query.query_string.query;
              buckets[key].key = key;
              sortedBuckets.push(buckets[key]);
            });
          }
          return sortedBuckets;
        }
        return buckets;
      };

      const getSeriesName = (series, metric) => {
        if (!series) return metric.makeLabel();
        if (metrics.length === 1) return series.trim().replace(/:+$/g, '');
        return series + metric.makeLabel();
      };

      const getSeries = (data, chart, seri, category, aggs = [], done = false) => {
        if (done) {
          _.map(metrics, metric => {
            if (metric.schema.name === 'radius') return;
            const responseAggs = metric.getResponseAggs ? metric.getResponseAggs() : [metric];
            responseAggs.forEach(metric => {
              const name = getSeriesName(seri, metric);
              const value = metric.getValue(data) * scale;
              if (!charts[chart]) {
                charts[chart] = {
                  aggId: chart,
                  label: segment ? segment.makeLabel() : '',
                  series: {}
                };

                if (segment) {
                  const isDate = segment.type.name === 'date_histogram';
                  const bounds = isDate ? segment.buckets.getBounds() : {};
                  charts[chart].ordered = {
                    date: isDate,
                    interval: segment.buckets ? segment.buckets.getInterval().asMilliseconds() : segment.params.interval,
                    min: bounds.min ? bounds.min._d.valueOf() : null,
                    max: bounds.max ? bounds.max._d.valueOf() : null
                  };
                }
              }
              if (!charts[chart].series[name]) {
                const metricAgg = {
                  id: metric.parentId || metric.id,
                  label: metric.makeLabel(),
                  formatter: metric.fieldFormatter('text'),
                  value: 'y'
                };
                charts[chart].series[name] = {
                  aggId: metric.parentId || metric.id,
                  label: name,
                  formatter: metric.fieldFormatter('text'),
                  aggs: aggs.concat(metricAgg).slice().reverse(),
                  values: []
                };
              }
              yAxisFormatter = metric.fieldFormatter('text');
              charts[chart].xAxisFormatter = xAxisFormatter;
              charts[chart].yAxisFormatter = yAxisFormatter;
              charts[chart].series[name].values.push({
                ...category,
                y: value,
                z: radius ? radius.getValue(data) * scale : null
              });
            });

          });
          return;
        }

        _.map(data, (agg, id) => {
          if (!_.isObject(agg)) return;
          const aggConfig = vis.aggs.find(agg => agg.id === id);

          if (!aggConfig) throw 'undefined aggregation while converting series data';
          if (agg.buckets) {
            agg.buckets = sortBuckets(aggConfig, agg.buckets);
          }

          if (aggConfig.schema.name === 'split') {
            chartSplit = aggConfig.params.row ? 'row' : 'column';
            _.map(agg.buckets, (bucket, key) => {
              const bucketProps = getBucketProps(aggConfig, bucket, key);

              chart = bucketProps.value;
              if (!charts[chart]) {
                charts[chart] = {
                  label: aggConfig.makeLabel(chart),
                  series: {}
                };
              }

              return getSeries(bucket, chart, seri, category, aggs.concat(bucketProps), id === lastBucket.id);
            });
          } else if (aggConfig.schema.name === 'segment') {
            xAxisFormatter = aggConfig.fieldFormatter('text');
            scale = aggConfig.write().metricScale || 1;

            _.map(agg.buckets, (bucket, key) => {
              const useRawValue = !['range', 'ip_range', 'date_range', 'filters'].includes(aggConfig.type.name);
              const value = {
                x_as_string: getBucketKey(aggConfig, bucket, key),
                x_raw: getBucketRawKey(aggConfig, bucket),
                x: useRawValue ? getBucketRawKey(aggConfig, bucket) : getBucketKey(aggConfig, bucket, key)
              };
              const newAggs = aggs.concat({
                id: aggConfig.id,
                label: aggConfig.makeLabel(),
                value: 'x_as_string'
              });

              if (aggConfig.type.name === 'range') {
                xAxisFormatter = x => x;
              }

              return getSeries(bucket, chart, seri, value, newAggs, id === lastBucket.id);
            });

          } else if (aggConfig.schema.group === 'buckets') {
            _.map(agg.buckets, (bucket, key) => {
              const bucketProps = getBucketProps(aggConfig, bucket, key);
              return getSeries(bucket, chart, seri + bucketProps.value + ': ', category, aggs.concat(bucketProps), id === lastBucket.id);
            });
          }

        });
      };

      let result;
      if (buckets.length === 0) {
        if (metrics.length > 1 || metrics[0].type.name !== 'count') {
          clonedResponse.aggregations.doc_count = clonedResponse.hits.total;
          getSeries(clonedResponse.aggregations, 0, '', null, [], true);
          result = {
            charts: _.map(charts, chart => {
              chart.series = _.values(chart.series);
              return chart;
            })
          };
        } else {
          result = {
            charts: [{
              label: '',
              series: [{
                label: 'Count',
                aggs: [{ label: 'Count', value: clonedResponse.hits.total }],
                formatter: metrics[0].fieldFormatter('text'),
                values: [ { x: 'all', y: clonedResponse.hits.total } ]
              }]
            }]
          };
        }
      } else {
        getSeries(clonedResponse.aggregations, 0, '');
        result = {
          charts: _.map(charts, chart => {
            chart.series = _.values(chart.series);
            return chart;
          })
        };
      }

      result.split = chartSplit;
      result.hits = clonedResponse.hits.total;

      return Promise.resolve(result);
    }
  };
};

VisResponseHandlersRegistryProvider.register(seriesResponseHandlerProvider);

export { seriesResponseHandlerProvider };
