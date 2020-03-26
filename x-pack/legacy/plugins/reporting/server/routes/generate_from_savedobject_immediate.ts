/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { API_BASE_GENERATE_V1 } from '../../common/constants';
import { createJobFactory, executeJobFactory } from '../../export_types/csv_from_savedobject';
import { getJobParamsFromRequest } from '../../export_types/csv_from_savedobject/server/lib/get_job_params_from_request';
import { JobDocPayloadPanelCsv } from '../../export_types/csv_from_savedobject/types';
import {
  JobDocOutput,
  Logger,
  ReportingResponseToolkit,
  ResponseFacade,
  ServerFacade,
} from '../../types';
import { ReportingSetupDeps, ReportingCore } from '../types';
import { makeRequestFacade } from './lib/make_request_facade';
import { getRouteOptionsCsv } from './lib/route_config_factories';

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
  reporting: ReportingCore,
  server: ServerFacade,
  plugins: ReportingSetupDeps,
  parentLogger: Logger
) {
  const routeOptions = getRouteOptionsCsv(server, plugins, parentLogger);
  const { elasticsearch } = plugins;

  /*
   * CSV export with the `immediate` option does not queue a job with Reporting's ESQueue to run the job async. Instead, this does:
   *  - re-use the createJob function to build up es query config
   *  - re-use the executeJob function to run the scan and scroll queries and capture the entire CSV in a result object.
   */
  server.route({
    path: `${API_BASE_GENERATE_V1}/immediate/csv/saved-object/{savedObjectType}:{savedObjectId}`,
    method: 'POST',
    options: routeOptions,
    handler: async (legacyRequest: Legacy.Request, h: ReportingResponseToolkit) => {
      const request = makeRequestFacade(legacyRequest);
      const logger = parentLogger.clone(['savedobject-csv']);
      const jobParams = getJobParamsFromRequest(request, { isImmediate: true });

      /* TODO these functions should be made available in the export types registry:
       *
       *     const { createJobFn, executeJobFn } = exportTypesRegistry.getById(CSV_FROM_SAVEDOBJECT_JOB_TYPE)
       *
       * Calling an execute job factory requires passing a browserDriverFactory option, so we should not call the factory from here
       */
      const createJobFn = createJobFactory(reporting, server, elasticsearch, logger);
      const executeJobFn = await executeJobFactory(reporting, server, elasticsearch, logger);
      const jobDocPayload: JobDocPayloadPanelCsv = await createJobFn(
        jobParams,
        request.headers,
        request
      );
      const {
        content_type: jobOutputContentType,
        content: jobOutputContent,
        size: jobOutputSize,
      }: JobDocOutput = await executeJobFn(null, jobDocPayload, request);

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
