/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteOptions } from '../..';
import {
  createESQLRuleParamsSchemaV1,
  createESQLBodySchemaV1,
  type CreateESQLRuleResponseV1,
  type CreateESQLRuleRequestBodyV1,
} from '../../../../common/routes/esql_rule/apis/create';
import { esqlRuleResponseSchema } from '../../../../common/routes/rule/response';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../constants';
import { handleDisabledApiKeysError, verifyAccessAndContext } from '../../lib';
import { validateInternalRuleType } from '../../lib/validate_internal_rule_type';
import { transformESQLRuleToResponseV1 } from '../transforms';

export const createEsqlRuleRoute = (routeOptions: RouteOptions) => {
  const { router, licenseState } = routeOptions;
  router.post(
    {
      path: `/internal/rule/esql/{id?}`,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: {
        access: 'internal',
        summary: `Create an ESQL rule`,
      },
      validate: {
        request: {
          body: createESQLBodySchemaV1,
          params: createESQLRuleParamsSchemaV1,
        },
        response: {
          200: {
            body: () => esqlRuleResponseSchema,
            description: 'Indicates a successful call.',
          },
          400: {
            description: 'Indicates an invalid schema or parameters.',
          },
          403: {
            description: 'Indicates that this call is forbidden.',
          },
          409: {
            description: 'Indicates that the rule id is already in use.',
          },
        },
      },
    },
    handleDisabledApiKeysError(
      router.handleLegacyErrors(
        verifyAccessAndContext(licenseState, async function (context, req, res) {
          const alertingContext = await context.alerting;
          const rulesClient = await alertingContext.getRulesClient();
          const ruleTypes = alertingContext.listTypes();
          const ruleData: CreateESQLRuleRequestBodyV1 = req.body;

          validateInternalRuleType({
            ruleTypeId: '.esql',
            ruleTypes,
            operationText: 'create',
          });

          const createdRule = await rulesClient.createESQLRule(ruleData);

          const response: CreateESQLRuleResponseV1 = {
            body: transformESQLRuleToResponseV1(createdRule),
          };

          return res.ok(response);
        })
      )
    )
  );
};
