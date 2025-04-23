/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import { mapSettledResponses } from '@kbn/cck-plugin/common';
import { resolveParamsSchemaV1 } from '../../../../../common/routes/rule/apis/resolve';
import type { ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../../../types';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../constants';

export type ResolveRuleRequestParamsV1 = TypeOf<typeof resolveParamsSchemaV1>;

export const remoteResolveRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rule/{id}/_resolve/_remote`,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: { access: 'internal' },
      validate: {
        params: resolveParamsSchemaV1,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const alertingContext = await context.alerting;
        const cckClient = alertingContext.cckClientGetter();

        const responses = await cckClient.request(
          'GET',
          `${INTERNAL_BASE_ALERTING_API_PATH}/rule/{id}/_resolve`.replace('{id}', req.params.id)
        );
        return res.ok({
          body: Object.fromEntries(
            mapSettledResponses(
              responses,
              (response, server) => {
                return [server, response];
              },
              (error, server) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return [server, { error } as any];
              }
            )
          ),
        });
      })
    )
  );
};
