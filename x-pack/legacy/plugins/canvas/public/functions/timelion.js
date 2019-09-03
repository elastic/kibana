/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten } from 'lodash';
import chrome from 'ui/chrome';
import { fetch } from '../../common/lib/fetch';
import { buildBoolArray } from '../../server/lib/build_bool_array';

export const timelion = () => ({
  name: 'timelion',
  type: 'datatable',
  help: 'Use Timelion to extract one or more timeseries from many sources.',
  context: {
    types: ['filter'],
  },
  args: {
    query: {
      types: ['string'],
      aliases: ['_', 'q'],
      help: 'A Timelion query',
      default: '".es(*)"',
    },
    interval: {
      types: ['string'],
      help: 'The bucket interval for the time series.',
      default: 'auto',
    },
    from: {
      type: ['string'],
      help: 'The Elasticsearch `datemath` string for the beginning of the time range.',
      default: 'now-1y',
    },
    to: {
      type: ['string'],
      help: 'The Elasticsearch `datemath` string for the end of the time range.',
      default: 'now',
    },
    timezone: {
      type: ['string'],
      help:
        'The timezone for the time range. See [Moment Timezone](https://momentjs.com/timezone/).',
      default: 'UTC',
    },
  },
  fn: (context, args) => {
    // Timelion requires a time range. Use the time range from the timefilter element in the
    // workpad, if it exists. Otherwise fall back on the function args.
    const timeFilter = context.and.find(and => and.type === 'time');
    const range = timeFilter
      ? { from: timeFilter.from, to: timeFilter.to }
      : { from: args.from, to: args.to };

    const body = {
      extended: {
        es: {
          filter: {
            bool: {
              must: buildBoolArray(context.and),
            },
          },
        },
      },
      sheet: [args.query],
      time: {
        from: range.from,
        to: range.to,
        interval: args.interval,
        timezone: args.timezone,
      },
    };

    return fetch(chrome.addBasePath(`/api/timelion/run`), {
      method: 'POST',
      responseType: 'json',
      data: body,
    }).then(resp => {
      const seriesList = resp.data.sheet[0].list;

      const rows = flatten(
        seriesList.map(series =>
          series.data.map(row => ({ '@timestamp': row[0], value: row[1], label: series.label }))
        )
      );

      return {
        type: 'datatable',
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: 'value', type: 'number' },
          { name: 'label', type: 'string' },
        ],
        rows: rows,
      };
    });
  },
});
