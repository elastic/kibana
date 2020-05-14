/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { get } from 'lodash';
import { IRouter, IBasePath } from 'src/core/server';
import { API_BASE_GENERATE_V1, CSV_FROM_SAVEDOBJECT_JOB_TYPE } from '../../common/constants';
import { getJobParamsFromRequest } from '../../export_types/csv_from_savedobject/server/lib/get_job_params_from_request';
import { Logger } from '../../types';
import { ReportingCore, ReportingSetupDeps } from '../types';
import { isoStringValidate } from '../lib/iso_string_validate';
import { makeRequestFacade } from './lib/make_request_facade';
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
  reporting: ReportingCore,
  plugins: ReportingSetupDeps,
  router: IRouter,
  basePath: IBasePath['get'],
  handleRoute: HandlerFunction,
  handleRouteError: HandlerErrorFunction,
  logger: Logger
) {
  router.post(
    {
      path: `${API_BASE_GENERATE_V1}/csv/saved-object/{savedObjectType}:{savedObjectId}`,
      validate: {
        params: schema.object({
          savedObjectType: schema.string({ minLength: 2 }),
          savedObjectId: schema.string({ minLength: 2 }),
        }),
        body: schema.object({
          state: schema.object({}),
          timerange: schema.object({
            timezone: schema.string({ defaultValue: 'UTC' }),
            min: schema.string({
              validate: isoStringValidate,
            }),
            max: schema.string({
              validate: isoStringValidate,
            }),
          }),
        }),
      },
    },
    router.handleLegacyErrors(async (context, req, res) => {
      const requestFacade = makeRequestFacade(context, req, basePath);

      /*
       * 1. Build `jobParams` object: job data that execution will need to reference in various parts of the lifecycle
       * 2. Pass the jobParams and other common params to `handleRoute`, a shared function to enqueue the job with the params
       * 3. Ensure that details for a queued job were returned
       */
      let result: QueuedJobPayload<any>;
      try {
        const jobParams = getJobParamsFromRequest(requestFacade, { isImmediate: false });
        result = await handleRoute(CSV_FROM_SAVEDOBJECT_JOB_TYPE, jobParams, requestFacade, res);
      } catch (err) {
        throw handleRouteError(CSV_FROM_SAVEDOBJECT_JOB_TYPE, err);
      }

      if (get(result, 'source.job') == null) {
        throw new Error(
          `The Export handler is expected to return a result with job info! ${result}`
        );
      }

      return res.ok({
        body: result,
        headers: {
          'content-type': 'application/json',
        },
      });
    })
  );
}
