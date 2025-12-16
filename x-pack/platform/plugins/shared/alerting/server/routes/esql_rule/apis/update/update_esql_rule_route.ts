/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { ESQLParamsV1 } from '@kbn/response-ops-rule-params';
import type {
  UpdateESQLRuleRequestBodyV1,
  UpdateESQLRuleRequestParamsV1,
  UpdateESQLRuleResponseV1,
} from '../../../../../common/routes/esql_rule/apis/update';
import {
  updateESQLBodySchemaV1,
  updateESQLRuleParamsSchemaV1,
} from '../../../../../common/routes/esql_rule/apis/update';
import { esqlRuleResponseSchemaV1 } from '../../../../../common/routes/esql_rule/response';
import type { Rule } from '../../../../application/rule/types';
import type { ILicenseState } from '../../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../types';
import { handleDisabledApiKeysError, verifyAccessAndContext } from '../../../lib';
import { transformESQLRuleToResponseV1 } from '../../transforms';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../constants';

export const updateEsqlRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.put(
    {
      path: `/internal/rule/esql/{id}`,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: {
        access: 'internal',
        summary: `Update an ESQL rule`,
      },
      validate: {
        request: {
          body: updateESQLBodySchemaV1,
          params: updateESQLRuleParamsSchemaV1,
        },
        response: {
          200: {
            body: () => esqlRuleResponseSchemaV1,
            description: 'Indicates a successful call.',
          },
          400: {
            description: 'Indicates an invalid schema or parameters.',
          },
          403: {
            description: 'Indicates that this call is forbidden.',
          },
          404: {
            description: 'Indicates a rule with the given ID does not exist.',
          },
          409: {
            description: 'Indicates that the rule has already been updated by another user.',
          },
        },
      },
    },
    handleDisabledApiKeysError(
      router.handleLegacyErrors(
        verifyAccessAndContext(licenseState, async function (context, req, res) {
          const alertingContext = await context.alerting;
          const rulesClient = await alertingContext.getRulesClient();

          const updateRuleData: UpdateESQLRuleRequestBodyV1 = req.body;
          const updateRuleParams: UpdateESQLRuleRequestParamsV1 = req.params;

          const updatedRule: Rule<ESQLParamsV1> = await rulesClient.updateESQLRule(
            updateRuleParams.id,
            updateRuleData
          );

          const response: UpdateESQLRuleResponseV1 = {
            body: transformESQLRuleToResponseV1(updatedRule),
          };

          return res.ok(response);
        })
      )
    )
  );
};
