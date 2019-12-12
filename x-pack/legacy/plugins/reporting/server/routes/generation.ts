/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import boom from 'boom';
import { API_BASE_URL } from '../../common/constants';
import {
  ServerFacade,
  ExportTypesRegistry,
  HeadlessChromiumDriverFactory,
  RequestFacade,
  ReportingResponseToolkit,
  Logger,
} from '../../types';
import { registerGenerateFromJobParams } from './generate_from_jobparams';
import { registerGenerateCsvFromSavedObject } from './generate_from_savedobject';
import { registerGenerateCsvFromSavedObjectImmediate } from './generate_from_savedobject_immediate';
import { registerLegacy } from './legacy';
import { createQueueFactory, enqueueJobFactory } from '../lib';

export function registerJobGenerationRoutes(
  server: ServerFacade,
  exportTypesRegistry: ExportTypesRegistry,
  browserDriverFactory: HeadlessChromiumDriverFactory,
  logger: Logger
) {
  const config = server.config();
  const DOWNLOAD_BASE_URL = config.get('server.basePath') + `${API_BASE_URL}/jobs/download`;
  // @ts-ignore TODO
  const { errors: esErrors } = server.plugins.elasticsearch.getCluster('admin');

  const esqueue = createQueueFactory(server, { exportTypesRegistry, browserDriverFactory });
  const enqueueJob = enqueueJobFactory(server, { exportTypesRegistry, esqueue });

  /*
   * Generates enqueued job details to use in responses
   */
  async function handler(
    exportTypeId: string,
    jobParams: object,
    request: RequestFacade,
    h: ReportingResponseToolkit
  ) {
    const user = request.pre.user;
    const headers = request.headers;

    const job = await enqueueJob(logger, exportTypeId, jobParams, user, headers, request);

    // return the queue's job information
    const jobJson = job.toJSON();

    return h
      .response({
        path: `${DOWNLOAD_BASE_URL}/${jobJson.id}`,
        job: jobJson,
      })
      .type('application/json');
  }

  function handleError(exportTypeId: string, err: Error) {
    if (err instanceof esErrors['401']) {
      return boom.unauthorized(`Sorry, you aren't authenticated`);
    }
    if (err instanceof esErrors['403']) {
      return boom.forbidden(`Sorry, you are not authorized to create ${exportTypeId} reports`);
    }
    if (err instanceof esErrors['404']) {
      return boom.boomify(err, { statusCode: 404 });
    }
    return err;
  }

  registerGenerateFromJobParams(server, handler, handleError);
  registerLegacy(server, handler, handleError);

  // Register beta panel-action download-related API's
  if (config.get('xpack.reporting.csv.enablePanelActionDownload')) {
    registerGenerateCsvFromSavedObject(server, handler, handleError);
    registerGenerateCsvFromSavedObjectImmediate(server, logger);
  }
}
