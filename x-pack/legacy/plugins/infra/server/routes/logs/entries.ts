/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from 'boom';

import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { get } from 'lodash';

import { throwErrors } from '../../../common/runtime_types';

import { InfraBackendLibs } from '../../lib/infra_types';
import {
  LOGS_ENTRIES_PATH,
  logsEntriesRequestRT,
  logsEntriesResponseRT,
} from '../../../common/http_api/logs';

export const initLogsEntriesRoute = ({ sources, framework }: InfraBackendLibs) => {
  framework.registerRoute({
    method: 'POST',
    path: LOGS_ENTRIES_PATH,
    handler: async (req, res) => {
      // const space = framework.getSpaceId(req);
      // FIXME -> Shouldn't this be the active space?
      const source = await sources.getSourceConfiguration(req, 'default');
      const payload = pipe(
        logsEntriesRequestRT.decode(req.payload),
        fold(throwErrors(Boom.badRequest), identity)
      );

      const timestampField = source.configuration.fields.timestamp;
      const tiebreakerField = source.configuration.fields.tiebreaker;
      const columns: string[] = source.configuration.logColumns.map((column): string => {
        if ('timestampColumn' in column) {
          return timestampField;
        }
        if ('messageColumn' in column) {
          return 'message';
        }
        if ('fieldColumn' in column) {
          return column.fieldColumn.field;
        }
        throw new Error('Unrecognised column type');
      });

      const { startDate, endDate } = payload;

      const query = await framework.callWithRequest(req, 'search', {
        index: source.configuration.logAlias,
        body: {
          size: 500,
          query: {
            range: {
              [timestampField]: {
                lte: endDate,
                gte: startDate,
              },
            },
          },
          sort: [{ [timestampField]: 'asc' }, { [tiebreakerField]: 'asc' }],
        },
      });

      return res.response(
        logsEntriesResponseRT.encode({
          // @ts-ignore FIXME type the search query
          entries: query.hits.hits.map(hit => {
            // FIXME treat "message" column as a special case
            const columnValues = columns.reduce<Record<string, string>>((values, column) => {
              // @ts-ignore
              values[column] = get(hit._source, column);
              return values;
            }, {});

            return {
              // @ts-ignore
              id: hit._id,
              ...columnValues,
            };
          }),
        })
      );
    },
  });
};
