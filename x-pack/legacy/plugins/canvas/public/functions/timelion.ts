/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten } from 'lodash';
import chrome from 'ui/chrome';
import { ExpressionFunction, DatatableRow } from 'src/plugins/expressions/public';
import { fetch } from '../../common/lib/fetch';
// @ts-ignore untyped local
import { buildBoolArray } from '../../server/lib/build_bool_array';
import { Datatable, Filter } from '../../types';
import { getFunctionHelp } from '../../i18n';

interface Arguments {
  query: string;
  interval: string;
  from: string;
  to: string;
  timezone: string;
}

export function timelion(): ExpressionFunction<'timelion', Filter, Arguments, Promise<Datatable>> {
  const { help, args: argHelp } = getFunctionHelp().timelion;

  return {
    name: 'timelion',
    type: 'datatable',
    help,
    context: {
      types: ['filter'],
    },
    args: {
      query: {
        types: ['string'],
        aliases: ['_', 'q'],
        help: argHelp.query,
        default: '".es(*)"',
      },
      interval: {
        types: ['string'],
        help: argHelp.interval,
        default: 'auto',
      },
      from: {
        types: ['string'],
        help: argHelp.from,
        default: 'now-1y',
      },
      to: {
        types: ['string'],
        help: argHelp.to,
        default: 'now',
      },
      timezone: {
        types: ['string'],
        help: argHelp.timezone,
        default: 'UTC',
      },
    },
    fn: (context, args): Promise<Datatable> => {
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
          seriesList.map((series: { data: any[]; label: string }) =>
            series.data.map(row => ({ '@timestamp': row[0], value: row[1], label: series.label }))
          )
        ) as DatatableRow[];

        return {
          type: 'datatable',
          columns: [
            { name: '@timestamp', type: 'date' },
            { name: 'value', type: 'number' },
            { name: 'label', type: 'string' },
          ],
          rows,
        };
      });
    },
  };
}
