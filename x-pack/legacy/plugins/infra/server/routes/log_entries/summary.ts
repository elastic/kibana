/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { schema } from '@kbn/config-schema';

import { throwErrors } from '../../../common/runtime_types';

import { InfraBackendLibs } from '../../lib/infra_types';
import {
  LOG_ENTRIES_SUMMARY_PATH,
  logEntriesSummaryRequestRT,
  logEntriesSummaryResponseRT,
} from '../../../common/http_api/log_entries';

import { buildLogSummaryQueryBody, DateRangeAggregation } from './helpers';

const escapeHatch = schema.object({}, { allowUnknowns: true });

export const initLogEntriesSummaryRoute = ({ framework, sources }: InfraBackendLibs) => {
  framework.registerRoute(
    {
      method: 'post',
      path: LOG_ENTRIES_SUMMARY_PATH,
      validate: { body: escapeHatch },
    },
    async (requestContext, request, response) => {
      try {
        const payload = pipe(
          logEntriesSummaryRequestRT.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );
        const { sourceId, startDate, endDate, bucketSize, query } = payload;

        const sourceConfiguration = (await sources.getSourceConfiguration(requestContext, sourceId))
          .configuration;

        const {
          timestamp: timestampField,
          tiebreaker: tiebreakerField,
        } = sourceConfiguration.fields;

        const esResults = await framework.callWithRequest<
          {},
          { log_summary: DateRangeAggregation }
        >(requestContext, 'search', {
          index: sourceConfiguration.logAlias,
          body: buildLogSummaryQueryBody({
            startDate,
            endDate,
            bucketSize,
            timestampField,
            tiebreakerField,
            query,
          }),
        });

        return response.ok({
          body: logEntriesSummaryResponseRT.encode({
            data: {
              start: startDate,
              end: endDate,
              buckets:
                esResults.aggregations?.log_summary.buckets.map(bucket => ({
                  start: bucket.from,
                  end: bucket.to,
                  entriesCount: bucket.doc_count,
                })) ?? [],
            },
          }),
        });
      } catch (error) {
        return response.internalError({
          body: error.message,
        });
      }
    }
  );
};
