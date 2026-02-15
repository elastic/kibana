/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IRouter, RouteConfigOptions, RouteMethod } from '@kbn/core/server';
import type {
  FindBackfillRequestQueryV1,
  FindBackfillResponseV1,
} from '../../../../../common/routes/backfill/apis/find';
import { findQuerySchemaV1 } from '../../../../../common/routes/backfill/apis/find';
import type { ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../types';
import {
  INTERNAL_ALERTING_BACKFILL_FIND_API_PATH,
  ALERTING_BACKFILL_FIND_API_PATH,
} from '../../../../types';
import { transformRequestV1, transformResponseV1 } from './transforms';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../constants';

interface BuildFindBackfillRouteParams {
  licenseState: ILicenseState;
  path: string;
  router: IRouter<AlertingRequestHandlerContext>;
  options: RouteConfigOptions<RouteMethod>;
}

const buildFindBackfillRoute = ({
  licenseState,
  path,
  router,
  options,
}: BuildFindBackfillRouteParams) => {
  router.post(
    {
      path,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options,
      validate: {
        query: findQuerySchemaV1,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const alertingContext = await context.alerting;
        const rulesClient = await alertingContext.getRulesClient();
        const query: FindBackfillRequestQueryV1 = req.query;

        const result = await rulesClient.findBackfill(transformRequestV1(query));
        const response: FindBackfillResponseV1 = {
          body: transformResponseV1(result),
        };
        return res.ok(response);
      })
    )
  );
};

export const findBackfillRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) =>
  buildFindBackfillRoute({
    licenseState,
    path: INTERNAL_ALERTING_BACKFILL_FIND_API_PATH,
    router,
    options: { access: 'internal' },
  });

export const findBackfillPublicRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) =>
  buildFindBackfillRoute({
    licenseState,
    path: ALERTING_BACKFILL_FIND_API_PATH,
    router,
    options: {
      access: 'public',
      summary: 'Find backfills for rules',
      tags: ['oas-tag:alerting'],
    },
  });
