/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { AlertingRequestHandlerContext } from '../types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../types';
import type { RewriteRequestCase } from './lib';
import { verifyAccessAndContext, rewriteNamespaces } from './lib';
import type { GetGlobalExecutionKPIParams } from '../rules_client';
import type { ILicenseState } from '../lib';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from './constants';

const querySchema = schema.object({
  date_start: schema.string(),
  date_end: schema.maybe(schema.string()),
  filter: schema.maybe(schema.string()),
  namespaces: schema.maybe(schema.arrayOf(schema.string())),
});

const rewriteReq: RewriteRequestCase<GetGlobalExecutionKPIParams> = ({
  date_start: dateStart,
  date_end: dateEnd,
  namespaces,
  ...rest
}) => ({
  ...rest,
  namespaces: rewriteNamespaces(namespaces),
  dateStart,
  dateEnd,
});

export const getGlobalExecutionKPIRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/_global_execution_kpi`,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: {
        access: 'internal',
      },
      validate: {
        query: querySchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const alertingContext = await context.alerting;
        const rulesClient = await alertingContext.getRulesClient();
        return res.ok({
          body: await rulesClient.getGlobalExecutionKpiWithAuth(rewriteReq(req.query)),
        });
      })
    )
  );
};
