/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { API_BASE_GENERATE_V1 } from '../../common/constants';
import { createJobFactory, executeJobFactory } from '../../export_types/csv_from_savedobject';
import {
  ServerFacade,
  RequestFacade,
  ResponseFacade,
  ReportingResponseToolkit,
  Logger,
  JobDocOutputExecuted,
} from '../../types';
import { JobDocPayloadPanelCsv } from '../../export_types/csv_from_savedobject/types';
import { getRouteOptionsCsv } from './lib/route_config_factories';
import { getJobParamsFromRequest } from '../../export_types/csv_from_savedobject/server/lib/get_job_params_from_request';

/*
 * This function registers API Endpoints for immediate Reporting jobs. The API inputs are:
 * - saved object type and ID
 * - time range and time zone
 * - application state:
 *     - filters
 *     - query bar
 *     - local (transient) changes the user made to the saved object
 */
export function registerGenerateCsvFromSavedObjectImmediate(
  server: ServerFacade,
  parentLogger: Logger
) {
  const routeOptions = getRouteOptionsCsv(server);

  /*
   * CSV export with the `immediate` option does not queue a job with Reporting's ESQueue to run the job async. Instead, this does:
   *  - re-use the createJob function to build up es query config
   *  - re-use the executeJob function to run the scan and scroll queries and capture the entire CSV in a result object.
   */
  server.route({
    path: `${API_BASE_GENERATE_V1}/immediate/csv/saved-object/{savedObjectType}:{savedObjectId}`,
    method: 'POST',
    options: routeOptions,
    handler: async (request: RequestFacade, h: ReportingResponseToolkit) => {
      const logger = parentLogger.clone(['savedobject-csv']);
      const jobParams = getJobParamsFromRequest(request, { isImmediate: true });
      const createJobFn = createJobFactory(server);
      const executeJobFn = executeJobFactory(server);
      const jobDocPayload: JobDocPayloadPanelCsv = await createJobFn(
        jobParams,
        request.headers,
        request
      );
      const {
        content_type: jobOutputContentType,
        content: jobOutputContent,
        size: jobOutputSize,
      }: JobDocOutputExecuted = await executeJobFn(null, jobDocPayload, request);

      logger.info(`Job output size: ${jobOutputSize} bytes`);

      /*
       * ESQueue worker function defaults `content` to null, even if the
       * executeJob returned undefined.
       *
       * This converts null to undefined so the value can be sent to h.response()
       */
      if (jobOutputContent === null) {
        logger.warn('CSV Job Execution created empty content result');
      }
      const response = h
        .response(jobOutputContent ? jobOutputContent : undefined)
        .type(jobOutputContentType);

      // Set header for buffer download, not streaming
      const { isBoom } = response as ResponseFacade;
      if (isBoom == null) {
        response.header('accept-ranges', 'none');
      }

      return response;
    },
  });
}
