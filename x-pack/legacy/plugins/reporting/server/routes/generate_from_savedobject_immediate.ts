/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, IBasePath } from 'src/core/server';
import { schema } from '@kbn/config-schema';
import { ReportingCore } from '../';
import { API_BASE_GENERATE_V1 } from '../../common/constants';
import { createJobFactory, executeJobFactory } from '../../export_types/csv_from_savedobject';
import { getJobParamsFromRequest } from '../../export_types/csv_from_savedobject/server/lib/get_job_params_from_request';
import { JobDocPayloadPanelCsv } from '../../export_types/csv_from_savedobject/types';
import { isoStringValidate } from '../lib/iso_string_validate';
import { makeRequestFacade } from './lib/make_request_facade';
import { LevelLogger as Logger } from '../lib';
import { JobDocOutput, ReportingSetupDeps } from '../types';

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
  plugins: ReportingSetupDeps,
  router: IRouter,
  basePath: IBasePath['get'],
  parentLogger: Logger
) {
  /*
   * CSV export with the `immediate` option does not queue a job with Reporting's ESQueue to run the job async. Instead, this does:
   *  - re-use the createJob function to build up es query config
   *  - re-use the executeJob function to run the scan and scroll queries and capture the entire CSV in a result object.
   */
  router.post(
    {
      path: `${API_BASE_GENERATE_V1}/immediate/csv/saved-object/{savedObjectType}:{savedObjectId}`,
      validate: {
        params: schema.object({
          savedObjectType: schema.string({ minLength: 5 }),
          savedObjectId: schema.string({ minLength: 5 }),
        }),
        body: schema.object({
          state: schema.object({}, { unknowns: 'allow' }),
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
      const request = makeRequestFacade(context, req, basePath);
      const logger = parentLogger.clone(['savedobject-csv']);
      const jobParams = getJobParamsFromRequest(request, { isImmediate: true });
      const createJobFn = createJobFactory(reporting, logger);
      const executeJobFn = await executeJobFactory(reporting, logger); // FIXME: does not "need" to be async
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

      return res.ok({
        body: jobOutputContent || '',
        headers: {
          'content-type': jobOutputContentType,
          'accept-ranges': 'none',
        },
      });
    })
  );
}
