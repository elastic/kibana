/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { ILicenseState } from '../../lib';
import { verifyApiAccess } from '../../lib';
import { BASE_ACTION_API_PATH } from '../../../common';
import type { ActionsRequestHandlerContext } from '../../types';
import { trackLegacyRouteUsage } from '../../lib/track_legacy_route_usage';

export const getAllActionRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState,
  usageCounter?: UsageCounter
) => {
  router.get(
    {
      path: `${BASE_ACTION_API_PATH}`,
      options: {
        access: 'public',
        summary: `Get all connectors`,
        deprecated: {
          documentationUrl:
            'https://www.elastic.co/docs/api/doc/kibana/v8/operation/operation-legacygetconnectors',
          severity: 'warning',
          reason: {
            type: 'migrate',
            newApiPath: `${BASE_ACTION_API_PATH}/connectors`,
            newApiMethod: 'GET',
          },
        },
        tags: ['oas-tag:connectors'],
      },
      validate: {},
    },
    router.handleLegacyErrors(async function (context, req, res) {
      verifyApiAccess(licenseState);
      if (!context.actions) {
        return res.badRequest({ body: 'RouteHandlerContext is not registered for actions' });
      }
      const actionsClient = (await context.actions).getActionsClient();
      const result = await actionsClient.getAll();
      trackLegacyRouteUsage('getAll', usageCounter);
      return res.ok({
        body: result,
      });
    })
  );
};
