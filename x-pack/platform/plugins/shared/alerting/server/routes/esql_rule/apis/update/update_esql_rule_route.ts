/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../../../types';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../constants';
import { handleDisabledApiKeysError, verifyAccessAndContext } from '../../../lib';
import { updateEsqlRuleDataSchema } from '../../../../application/esql_rule/methods/update/schemas';
import type { ILicenseState } from '../../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../types';

const updateEsqlRuleParamsSchema = schema.object({
  id: schema.string({ minLength: 1 }),
});

export const updateEsqlRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.put(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/esql_rule/{id}`,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: {
        access: 'internal',
        tags: ['access:alerting'],
      },
      validate: {
        request: {
          body: updateEsqlRuleDataSchema,
          params: updateEsqlRuleParamsSchema,
        },
      },
    },
    handleDisabledApiKeysError(
      router.handleLegacyErrors(
        verifyAccessAndContext(licenseState, async (context, req, res) => {
          const alertingContext = await context.alerting;
          const rulesClient = await alertingContext.getRulesClient();

          const updated = await rulesClient.updateEsqlRule({
            id: req.params.id,
            data: req.body,
          });

          return res.ok({ body: updated });
        })
      )
    )
  );
};
