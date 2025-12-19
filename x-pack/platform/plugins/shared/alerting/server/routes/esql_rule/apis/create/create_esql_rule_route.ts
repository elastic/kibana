/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { RouteOptions } from '../../..';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../../../types';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../constants';
import { handleDisabledApiKeysError, verifyAccessAndContext } from '../../../lib';
import { createEsqlRuleDataSchema } from '../../../../application/esql_rule/methods/create/schemas';

const createEsqlRuleParamsSchema = schema.object({
  id: schema.maybe(schema.string()),
});

export const createEsqlRuleRoute = ({ router, licenseState }: RouteOptions) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/esql_rule/{id?}`,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: {
        access: 'internal',
        tags: ['access:alerting'],
      },
      validate: {
        request: {
          body: createEsqlRuleDataSchema,
          params: createEsqlRuleParamsSchema,
        },
      },
    },
    handleDisabledApiKeysError(
      router.handleLegacyErrors(
        verifyAccessAndContext(licenseState, async (context, req, res) => {
          const alertingContext = await context.alerting;
          const rulesClient = await alertingContext.getRulesClient();

          const created = await rulesClient.createEsqlRule({
            data: req.body,
            options: { id: req.params.id },
          });

          return res.ok({ body: created });
        })
      )
    )
  );
};
