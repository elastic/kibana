/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import boom from 'boom';
import { errors as elasticsearchErrors } from 'elasticsearch';
import { Legacy } from 'kibana';
import { ReportingCore } from '../';
import { API_BASE_URL } from '../../common/constants';
import { LevelLogger } from '../lib';
import { ReportingSetupDeps, ServerFacade } from '../types';
import { registerGenerateFromJobParams } from './generate_from_jobparams';
import { registerGenerateCsvFromSavedObject } from './generate_from_savedobject';
import { registerGenerateCsvFromSavedObjectImmediate } from './generate_from_savedobject_immediate';
import { makeRequestFacade } from './lib/make_request_facade';

const esErrors = elasticsearchErrors as Record<string, any>;

export function registerJobGenerationRoutes(
  reporting: ReportingCore,
  server: ServerFacade,
  plugins: ReportingSetupDeps,
  logger: LevelLogger
) {
  const config = reporting.getConfig();
  const downloadBaseUrl =
    config.kbnConfig.get('server', 'basePath') + `${API_BASE_URL}/jobs/download`;

  /*
   * Generates enqueued job details to use in responses
   */
  async function handler(
    exportTypeId: string,
    jobParams: object,
    legacyRequest: Legacy.Request,
    h: Legacy.ResponseToolkit
  ) {
    const request = makeRequestFacade(legacyRequest);
    const user = request.pre.user;
    const headers = request.headers;

    const enqueueJob = await reporting.getEnqueueJob();
    const job = await enqueueJob(exportTypeId, jobParams, user, headers, request);

    // return the queue's job information
    const jobJson = job.toJSON();

    return h
      .response({
        path: `${downloadBaseUrl}/${jobJson.id}`,
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

  registerGenerateFromJobParams(reporting, server, plugins, handler, handleError, logger);

  // Register beta panel-action download-related API's
  if (config.get('csv', 'enablePanelActionDownload')) {
    registerGenerateCsvFromSavedObject(reporting, server, plugins, handler, handleError, logger);
    registerGenerateCsvFromSavedObjectImmediate(reporting, server, plugins, logger);
  }
}
