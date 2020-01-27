/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { editorConfigProviders } from 'ui/vis/editors/config/editor_config_providers';

export function initEditorConfig() {
  // Limit agg params based on rollup capabilities
  editorConfigProviders.register((indexPattern, aggTypeName, fieldName) => {
    if (indexPattern.type !== 'rollup') {
      return {};
    }

    // Exclude certain param options for terms:
    // otherBucket, missingBucket, orderBy, orderAgg
    if (aggTypeName === 'terms') {
      return {
        otherBucket: {
          hidden: true,
        },
        missingBucket: {
          hidden: true,
        },
      };
    }

    const rollupAggs = indexPattern.typeMeta && indexPattern.typeMeta.aggs;
    const fieldAgg =
      rollupAggs && fieldName && rollupAggs[aggTypeName] && rollupAggs[aggTypeName][fieldName];

    if (!rollupAggs || !fieldName || !fieldAgg) {
      return {};
    }

    // Set interval and base interval for histograms based on rollup capabilities
    if (aggTypeName === 'histogram') {
      const interval = fieldAgg.interval;
      return interval
        ? {
            intervalBase: {
              fixedValue: interval,
            },
            interval: {
              base: interval,
              help: i18n.translate('xpack.rollupJobs.editorConfig.histogram.interval.helpText', {
                defaultMessage: 'Must be a multiple of rollup configuration interval: {interval}',
                values: { interval },
              }),
            },
          }
        : {};
    }

    // Set date histogram time zone based on rollup capabilities
    if (aggTypeName === 'date_histogram') {
      // Interval is deprecated on date_histogram rollups, but may still be present
      // See https://github.com/elastic/kibana/pull/36310
      const interval = fieldAgg.calendar_interval || fieldAgg.fixed_interval || fieldAgg.interval;
      return {
        useNormalizedEsInterval: {
          fixedValue: false,
        },
        interval: {
          default: interval,
          timeBase: interval,
          help: i18n.translate(
            'xpack.rollupJobs.editorConfig.dateHistogram.customInterval.helpText',
            {
              defaultMessage: 'Must be a multiple of rollup configuration interval: {interval}',
              values: { interval },
            }
          ),
        },
      };
    }

    return {};
  });
}
