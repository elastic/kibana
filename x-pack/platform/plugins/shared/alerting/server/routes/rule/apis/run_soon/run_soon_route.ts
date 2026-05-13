/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type {
  RunSoonRequestParams,
  RunSoonRequestQuery,
} from '../../../../../common/routes/rule/apis/run_soon';
import {
  runSoonRequestParamsSchemaV1,
  runSoonRequestQuerySchemaV1,
} from '../../../../../common/routes/rule/apis/run_soon';
import type { ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../../../types';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../constants';

export const runSoonRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rule/{id}/_run_soon`,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: { access: 'internal' },
      validate: {
        params: runSoonRequestParamsSchemaV1,
        query: runSoonRequestQuerySchemaV1,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const alertingContext = await context.alerting;
        const rulesClient = await alertingContext.getRulesClient();
        const params: RunSoonRequestParams = req.params;
        const query: RunSoonRequestQuery = req.query;
        const message = await rulesClient.runSoon({ id: params.id, force: query?.force });
        return message ? res.ok({ body: message }) : res.noContent();
      })
    )
  );
};
