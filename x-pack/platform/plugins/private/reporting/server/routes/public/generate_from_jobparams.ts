/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaResponse } from '@kbn/core-http-router-server-internal';
import type { Logger } from '@kbn/core/server';
import { PUBLIC_ROUTES } from '@kbn/reporting-common';
import type { ReportingCore } from '../..';
import { authorizedUserPreRouting } from '../common';
import { RequestHandler } from '../common/generate';

export function registerGenerationRoutesPublic(reporting: ReportingCore, logger: Logger) {
  const setupDeps = reporting.getPluginSetupDeps();
  const { router } = setupDeps;

  const kibanaAccessControlTags = ['access:generateReport'];

  const registerPublicPostGenerationEndpoint = () => {
    const path = `${PUBLIC_ROUTES.GENERATE_PREFIX}/{exportType}`;
    router.post(
      {
        path,
        security: {
          authz: {
            enabled: false,
            reason: 'This route is opted out from authorization',
          },
        },
        validate: RequestHandler.getValidation(),
        options: { tags: kibanaAccessControlTags, access: 'public' },
      },
      authorizedUserPreRouting(reporting, async (user, context, req, res) => {
        try {
          const requestHandler = new RequestHandler(
            reporting,
            user,
            context,
            path,
            req,
            res,
            logger
          );
          return await requestHandler.handleGenerateRequest(
            req.params.exportType,
            requestHandler.getJobParams()
          );
        } catch (err) {
          if (err instanceof KibanaResponse) {
            return err;
          }
          throw err;
        }
      })
    );
  };

  const registerPublicGetGenerationEndpoint = () => {
    // Get route to generation endpoint: show error about GET method to user
    router.get(
      {
        path: `${PUBLIC_ROUTES.GENERATE_PREFIX}/{p*}`,
        security: {
          authz: {
            enabled: false,
            reason: 'This route is opted out from authorization',
          },
        },
        validate: false,
        options: { access: 'public' },
      },
      (_context, _req, res) => {
        return res.customError({ statusCode: 405, body: 'GET is not allowed' });
      }
    );
  };

  registerPublicPostGenerationEndpoint();
  registerPublicGetGenerationEndpoint();
}
