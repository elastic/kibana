/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IRouter } from '@kbn/core/server';
import type { GetGlobalExecutionSummaryResponseV1 } from '../../common/routes/rule/apis/global_execution_summary';
import { getGlobalExecutionSummarySchemaV1 } from '../../common/routes/rule/apis/global_execution_summary';
import type { AlertingRequestHandlerContext } from '../types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../types';
import type { RewriteRequestCase } from './lib';
import { verifyAccessAndContext } from './lib';
import type { GetGlobalExecutionSummaryParams } from '../rules_client';
import type { ILicenseState } from '../lib';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from './constants';

const rewriteReq: RewriteRequestCase<GetGlobalExecutionSummaryParams> = ({
  date_start: dateStart,
  date_end: dateEnd,
}) => ({
  dateStart,
  dateEnd,
});

export const getGlobalExecutionSummaryRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/_global_execution_summary`,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: {
        access: 'internal',
      },
      validate: {
        query: getGlobalExecutionSummarySchemaV1,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const alertingContext = await context.alerting;
        const rulesClient = await alertingContext.getRulesClient();
        const response: GetGlobalExecutionSummaryResponseV1 = {
          body: await rulesClient.getGlobalExecutionSummaryWithAuth(rewriteReq(req.query)),
        };
        return res.ok(response);
      })
    )
  );
};
