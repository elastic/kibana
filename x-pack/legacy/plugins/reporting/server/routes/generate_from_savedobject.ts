/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { API_BASE_GENERATE_V1, CSV_FROM_SAVEDOBJECT_JOB_TYPE } from '../../common/constants';
import { ServerFacade, RequestFacade, ReportingResponseToolkit } from '../../types';
import { HandlerErrorFunction, HandlerFunction, QueuedJobPayload } from './types';
import { getRouteOptionsCsv } from './lib/route_config_factories';
import { getJobParamsFromRequest } from '../../export_types/csv_from_savedobject/server/lib/get_job_params_from_request';

/*
 * This function registers API Endpoints for queuing Reporting jobs. The API inputs are:
 * - saved object type and ID
 * - time range and time zone
 * - application state:
 *     - filters
 *     - query bar
 *     - local (transient) changes the user made to the saved object
 */
export function registerGenerateCsvFromSavedObject(
  server: ServerFacade,
  handleRoute: HandlerFunction,
  handleRouteError: HandlerErrorFunction
) {
  const routeOptions = getRouteOptionsCsv(server);

  server.route({
    path: `${API_BASE_GENERATE_V1}/csv/saved-object/{savedObjectType}:{savedObjectId}`,
    method: 'POST',
    options: routeOptions,
    handler: async (request: RequestFacade, h: ReportingResponseToolkit) => {
      /*
       * 1. Build `jobParams` object: job data that execution will need to reference in various parts of the lifecycle
       * 2. Pass the jobParams and other common params to `handleRoute`, a shared function to enqueue the job with the params
       * 3. Ensure that details for a queued job were returned
       */

      let result: QueuedJobPayload<any>;
      try {
        const jobParams = getJobParamsFromRequest(request, { isImmediate: false });
        result = await handleRoute(CSV_FROM_SAVEDOBJECT_JOB_TYPE, jobParams, request, h);
      } catch (err) {
        throw handleRouteError(CSV_FROM_SAVEDOBJECT_JOB_TYPE, err);
      }

      if (get(result, 'source.job') == null) {
        throw new Error(
          `The Export handler is expected to return a result with job info! ${result}`
        );
      }

      return result;
    },
  });
}
