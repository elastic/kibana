/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request, ResponseToolkit } from 'hapi';
import { get } from 'lodash';

import { API_BASE_GENERATE_V1, CSV_FROM_SAVEDOBJECT_JOB_TYPE } from '../../common/constants';
import { KbnServer } from '../../types';
import { HandlerErrorFunction, HandlerFunction, QueuedJobPayload } from './types';
import { getRouteOptions } from './lib/route_config_factories';
import { getJobParamsFromRequest } from './lib/get_job_params_from_request';

/*
 * 1. Build `jobParams` object: job data that execution will need to reference in various parts of the lifecycle
 * 2. Pass the jobParams and other common params to `handleRoute`, a shared function to enqueue the job with the params
 * 3. Ensure that details for a queued job were returned
 */
const getJobFromRouteHandler = async (
  handleRoute: HandlerFunction,
  handleRouteError: HandlerErrorFunction,
  request: Request,
  h: ResponseToolkit
): Promise<QueuedJobPayload> => {
  let result: QueuedJobPayload;
  try {
    const jobParams = getJobParamsFromRequest(request, { isImmediate: false });
    result = await handleRoute(CSV_FROM_SAVEDOBJECT_JOB_TYPE, jobParams, request, h);
  } catch (err) {
    throw handleRouteError(CSV_FROM_SAVEDOBJECT_JOB_TYPE, err);
  }

  if (get(result, 'source.job') == null) {
    throw new Error(`The Export handler is expected to return a result with job info! ${result}`);
  }

  return result;
};

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
  server: KbnServer,
  handleRoute: HandlerFunction,
  handleRouteError: HandlerErrorFunction
) {
  const routeOptions = getRouteOptions(server);

  server.route({
    path: `${API_BASE_GENERATE_V1}/csv/saved-object/{savedObjectType}:{savedObjectId}`,
    method: 'POST',
    options: routeOptions,
    handler: async (request: Request, h: ResponseToolkit) => {
      return getJobFromRouteHandler(handleRoute, handleRouteError, request, h);
    },
  });
}
