/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { errors as elasticsearchErrors } from 'elasticsearch';
import { IRouter, IBasePath, kibanaResponseFactory } from 'src/core/server';
import { ReportingCore } from '../';
import { API_BASE_URL } from '../../common/constants';
import { LevelLogger as Logger } from '../lib';
import { ReportingSetupDeps } from '../types';
import { registerGenerateFromJobParams } from './generate_from_jobparams';
import { registerGenerateCsvFromSavedObject } from './generate_from_savedobject';
import { registerGenerateCsvFromSavedObjectImmediate } from './generate_from_savedobject_immediate';
import { HandlerFunction } from './types';

const esErrors = elasticsearchErrors as Record<string, any>;

export function registerJobGenerationRoutes(
  reporting: ReportingCore,
  plugins: ReportingSetupDeps,
  router: IRouter,
  basePath: IBasePath['get'],
  logger: Logger
) {
  const config = reporting.getConfig();
  const downloadBaseUrl =
    config.kbnConfig.get('server', 'basePath') + `${API_BASE_URL}/jobs/download`;

  /*
   * Generates enqueued job details to use in responses
   */
  const handler: HandlerFunction = async (username, exportTypeId, jobParams, r, h) => {
    const licenseInfo = reporting.getLicenseInfo();
    const licenseResults = licenseInfo[exportTypeId];

    if (!licenseResults.enableLinks) {
      return h.forbidden({ body: licenseResults.message });
    }

    const { headers } = r;
    const enqueueJob = await reporting.getEnqueueJob();
    const job = await enqueueJob(exportTypeId, jobParams, username, headers, r);

    // return the queue's job information
    const jobJson = job.toJSON();

    return h.ok({
      headers: {
        'content-type': 'application/json',
      },
      body: {
        path: `${downloadBaseUrl}/${jobJson.id}`,
        job: jobJson,
      },
    });
  };

  function handleError(exportTypeId: string, err: Error, res: typeof kibanaResponseFactory) {
    if (err instanceof esErrors['401']) {
      return res.unauthorized({
        body: `Sorry, you aren't authenticated`,
      });
    }

    if (err instanceof esErrors['403']) {
      return res.forbidden({
        body: `Sorry, you are not authorized to create ${exportTypeId} reports`,
      });
    }

    if (err instanceof esErrors['404']) {
      return res.notFound({
        body: err.message,
      });
    }

    return res.badRequest({
      body: err.message,
    });
  }

  registerGenerateFromJobParams(reporting, plugins, router, basePath, handler, handleError);

  // Register beta panel-action download-related API's
  if (config.get('csv', 'enablePanelActionDownload')) {
    registerGenerateCsvFromSavedObject(
      reporting,
      plugins,
      router,
      basePath,
      handler,
      handleError,
      logger
    );

    registerGenerateCsvFromSavedObjectImmediate(reporting, plugins, router, basePath, logger);
  }
}
