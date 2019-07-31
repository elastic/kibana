/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import { InfraBackendLibs } from '../../../lib/infra_types';
import {
  LOG_ANALYSIS_GET_LOG_ENTRY_RATE_PATH,
  getLogEntryRateRequestPayloadRT,
  getLogEntryRateSuccessReponsePayloadRT,
} from '../../../../common/http_api/log_analysis';
import { throwErrors } from '../../../../common/runtime_types';

export const initLogAnalysisGetLogEntryRateRoute = ({
  framework,
  logAnalysis,
}: InfraBackendLibs) => {
  framework.registerRoute({
    method: 'POST',
    path: LOG_ANALYSIS_GET_LOG_ENTRY_RATE_PATH,
    handler: async (req, res) => {
      const payload = getLogEntryRateRequestPayloadRT
        .decode(req.payload)
        .getOrElseL(throwErrors(Boom.badRequest));

      const logEntryRateBuckets = await logAnalysis
        .getLogEntryRateBuckets(
          req,
          payload.data.sourceId,
          payload.data.timeRange.startTime,
          payload.data.timeRange.endTime
        )
        .catch(err => {
          throw Boom.boomify(err, { statusCode: ('statusCode' in err && err.statusCode) || 500 });
        });

      return res.response(
        getLogEntryRateSuccessReponsePayloadRT.encode({
          data: { histogramBuckets: logEntryRateBuckets },
        })
      );
    },
  });
};
