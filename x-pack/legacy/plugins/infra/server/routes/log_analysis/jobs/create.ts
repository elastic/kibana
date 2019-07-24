/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import { InfraBackendLibs } from '../../../lib/infra_types';
import {
  createJobsRequestPayloadRuntimeType,
  createJobsSuccessReponsePayloadRuntimeType,
  LOG_ANALYSIS_CREATE_JOBS_PATH,
} from '../../../../common/http_api';
import { throwErrors } from '../../../../common/runtime_types';

export const initLogAnalysisCreateJobRoute = ({ framework }: InfraBackendLibs) => {
  framework.registerRoute({
    method: 'POST',
    path: LOG_ANALYSIS_CREATE_JOBS_PATH,
    handler: (req, res) => {
      const payload = createJobsRequestPayloadRuntimeType
        .decode(req.payload)
        .getOrElseL(throwErrors(Boom.badRequest));

      return res.response(
        createJobsSuccessReponsePayloadRuntimeType.encode({ data: { jobs: [] } })
      );
    },
  });
};
