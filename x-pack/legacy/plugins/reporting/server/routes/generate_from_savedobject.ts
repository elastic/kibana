/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { get } from 'lodash';
import { API_BASE_GENERATE_V1, CSV_FROM_SAVEDOBJECT_JOB_TYPE } from '../../common/constants';
import { getJobParamsFromRequest } from '../../export_types/csv_from_savedobject/server/lib/get_job_params_from_request';
import { Logger, ReportingResponseToolkit, ServerFacade } from '../../types';
import { ReportingSetupDeps } from '../types';
import { makeRequestFacade } from './lib/make_request_facade';
import { getRouteOptionsCsv } from './lib/route_config_factories';
import { HandlerErrorFunction, HandlerFunction, QueuedJobPayload } from './types';

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
  plugins: ReportingSetupDeps,
  handleRoute: HandlerFunction,
  handleRouteError: HandlerErrorFunction,
  logger: Logger
) {
  const routeOptions = getRouteOptionsCsv(server, plugins, logger);

  server.route({
    path: `${API_BASE_GENERATE_V1}/csv/saved-object/{savedObjectType}:{savedObjectId}`,
    method: 'POST',
    options: routeOptions,
    handler: async (legacyRequest: Legacy.Request, h: ReportingResponseToolkit) => {
      const requestFacade = makeRequestFacade(legacyRequest);

      /*
       * 1. Build `jobParams` object: job data that execution will need to reference in various parts of the lifecycle
       * 2. Pass the jobParams and other common params to `handleRoute`, a shared function to enqueue the job with the params
       * 3. Ensure that details for a queued job were returned
       */
      let result: QueuedJobPayload<any>;
      try {
        const jobParams = getJobParamsFromRequest(requestFacade, { isImmediate: false });
        result = await handleRoute(CSV_FROM_SAVEDOBJECT_JOB_TYPE, jobParams, legacyRequest, h); // pass the original request because the handler will make the request facade on its own
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
