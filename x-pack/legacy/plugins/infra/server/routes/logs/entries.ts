/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from 'boom';

import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import { throwErrors } from '../../../common/runtime_types';

import { InfraBackendLibs } from '../../lib/infra_types';
import {
  LOGS_ENTRIES_PATH,
  logsEntriesRequestRT,
  logsEntriesResponseRT,
} from '../../../common/http_api/logs';

export const initLogsEntriesRoute = ({ framework }: InfraBackendLibs) => {
  framework.registerRoute({
    method: 'POST',
    path: LOGS_ENTRIES_PATH,
    handler: async (req, res) => {
      const payload = pipe(
        logsEntriesRequestRT.decode(req.payload),
        fold(throwErrors(Boom.badRequest), identity)
      );

      const { startDate, endDate } = payload;

      const query = await framework.callWithRequest(req, 'search', {
        index: 'filebeat-*',
        body: {
          size: 500,
          query: {
            range: {
              '@timestamp': {
                lte: endDate,
                gte: startDate,
              },
            },
          },
          sort: [{ '@timestamp': 'asc' }, { _doc: 'asc' }],
        },
      });

      return res.response(
        logsEntriesResponseRT.encode({
          // @ts-ignore FIXME type the search query
          entries: query.hits.hits.map(hit => {
            return {
              // @ts-ignore
              id: hit._id,
              // @ts-ignore
              message: hit._source.message,
              // @ts-ignore
              timestamp: hit._source['@timestamp'],
              // @ts-ignore
              'event.dataset': hit._source.event?.dataset,
            };
          }),
        })
      );
    },
  });
};
