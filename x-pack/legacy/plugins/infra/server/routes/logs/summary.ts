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
  LOGS_SUMMARY_PATH,
  logsSummaryRequestRT,
  logsSummaryResponseRT,
} from '../../../common/http_api/logs';

// FIXME: move to a shared place, or to the elasticsearch-js repo
interface AutoDateHistogramAggregation {
  buckets: Array<{ key_as_string: string; key: number; doc_count: number }>;
  interval: string;
}

export const initLogsSummaryRoute = ({ framework }: InfraBackendLibs) => {
  framework.registerRoute({
    method: 'POST',
    path: LOGS_SUMMARY_PATH,
    handler: async (req, res) => {
      const payload = pipe(
        logsSummaryRequestRT.decode(req.payload),
        fold(throwErrors(Boom.badRequest), identity)
      );

      const { startDate, endDate } = payload;

      const query = await framework.callWithRequest<
        {},
        { log_summary: AutoDateHistogramAggregation }
      >(req, 'search', {
        index: 'filebeat-*',
        body: {
          size: 0,
          query: {
            range: {
              '@timestamp': {
                lte: endDate,
                gte: startDate,
              },
            },
          },
          aggs: {
            log_summary: {
              auto_date_histogram: {
                field: '@timestamp',
                buckets: 300, // TODO How much resolution we want for the minimap?
              },
            },
          },
          sort: [{ '@timestamp': 'asc' }, { _doc: 'asc' }],
        },
      });

      return res.response(
        logsSummaryResponseRT.encode({
          buckets: query.aggregations?.log_summary.buckets ?? [],
        })
      );
    },
  });
};
