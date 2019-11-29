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
interface DateRangeAggregation {
  buckets: Array<{
    key: number;
    doc_count: number;
    from: number;
    from_as_strign: string;
    to: number;
    to_as_string: string;
  }>;
  start: number;
  end: number;
}

export const initLogsSummaryRoute = ({ framework, sources }: InfraBackendLibs) => {
  framework.registerRoute({
    method: 'POST',
    path: LOGS_SUMMARY_PATH,
    handler: async (req, res) => {
      try {
        // const space = framework.getSpaceId(req);
        // FIXME -> Shouldn't this be the active space?
        const source = await sources.getSourceConfiguration(req, 'default');
        const payload = pipe(
          logsSummaryRequestRT.decode(req.payload),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const timestampField = source.configuration.fields.timestamp;
        const { startDate, endDate, bucketSize } = payload;

        const ranges = [];
        for (let start = startDate as number; start <= endDate; start += bucketSize) {
          ranges.push({ from: start, to: start + bucketSize });
        }

        const query = await framework.callWithRequest<{}, { log_summary: DateRangeAggregation }>(
          req,
          'search',
          {
            index: source.configuration.logAlias,
            body: {
              size: 0,
              query: {
                range: {
                  [timestampField]: {
                    lte: endDate,
                    gte: startDate,
                  },
                },
              },
              aggs: {
                log_summary: {
                  date_range: {
                    field: timestampField,
                    ranges,
                  },
                },
              },
              sort: [{ [timestampField]: 'asc' }],
            },
          }
        );

        return res.response(
          logsSummaryResponseRT.encode({
            start: startDate,
            end: endDate,
            buckets:
              query.aggregations?.log_summary.buckets.map(bucket => ({
                start: bucket.from,
                end: bucket.to,
                entriesCount: bucket.doc_count,
              })) ?? [],
          })
        );
      } catch (error) {
        // FIXME handle this
      }
    },
  });
};
