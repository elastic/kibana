/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';

import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { InfraBackendLibs } from '../../../lib/infra_types';
import {
  LOG_ANALYSIS_GET_LOG_ENTRY_RATE_PATH,
  getLogEntryRateRequestPayloadRT,
  getLogEntryRateSuccessReponsePayloadRT,
} from '../../../../common/http_api/log_analysis';
import { throwErrors } from '../../../../common/runtime_types';
import { NoLogRateResultsIndexError } from '../../../lib/log_analysis';

export const initLogAnalysisGetLogEntryRateRoute = ({
  framework,
  logAnalysis,
}: InfraBackendLibs) => {
  framework.registerRoute({
    method: 'POST',
    path: LOG_ANALYSIS_GET_LOG_ENTRY_RATE_PATH,
    handler: async (req, res) => {
      const payload = pipe(
        getLogEntryRateRequestPayloadRT.decode(req.payload),
        fold(throwErrors(Boom.badRequest), identity)
      );

      const logEntryRateBuckets = await logAnalysis
        .getLogEntryRateBuckets(
          req,
          payload.data.sourceId,
          payload.data.timeRange.startTime,
          payload.data.timeRange.endTime,
          payload.data.bucketDuration
        )
        .catch(err => {
          if (err instanceof NoLogRateResultsIndexError) {
            throw Boom.boomify(err, { statusCode: 404 });
          }

          throw Boom.boomify(err, { statusCode: ('statusCode' in err && err.statusCode) || 500 });
        });

      return res.response(
        getLogEntryRateSuccessReponsePayloadRT.encode({
          data: {
            bucketDuration: payload.data.bucketDuration,
            histogramBuckets: logEntryRateBuckets,
          },
        })
      );
    },
  });
};
