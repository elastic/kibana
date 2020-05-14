/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import boom from 'boom';
import { errors as elasticsearchErrors } from 'elasticsearch';
import { IRouter, IBasePath, kibanaResponseFactory } from 'src/core/server';
import { authorizedUserPreRoutingFactory } from './lib/authorized_user_pre_routing';
import { API_BASE_URL } from '../../common/constants';
import { Logger, RequestFacade } from '../../types';
import { ReportingCore, ReportingSetupDeps } from '../types';
import { registerGenerateFromJobParams } from './generate_from_jobparams';
import { registerGenerateCsvFromSavedObject } from './generate_from_savedobject';
import { registerGenerateCsvFromSavedObjectImmediate } from './generate_from_savedobject_immediate';

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
  async function handler(
    exportTypeId: string,
    jobParams: object,
    r: RequestFacade,
    h: typeof kibanaResponseFactory
  ) {
    const licenseInfo = reporting.getLicenseInfo();
    const licenseResults = licenseInfo[exportTypeId];

    if (!licenseResults.enableLinks) {
      throw boom.forbidden(licenseResults.message);
    }

    const getUser = authorizedUserPreRoutingFactory(config, plugins, logger);
    const { username } = getUser(r.getRawRequest());
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
  }

  function handleError(exportTypeId: string, err: Error) {
    if (err instanceof esErrors['401']) {
      throw boom.unauthorized(`Sorry, you aren't authenticated`);
    }
    if (err instanceof esErrors['403']) {
      throw boom.forbidden(`Sorry, you are not authorized to create ${exportTypeId} reports`);
    }
    if (err instanceof esErrors['404']) {
      throw boom.boomify(err, { statusCode: 404 });
    }
    throw err;
  }

  registerGenerateFromJobParams(reporting, plugins, router, basePath, handler, handleError, logger);

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
