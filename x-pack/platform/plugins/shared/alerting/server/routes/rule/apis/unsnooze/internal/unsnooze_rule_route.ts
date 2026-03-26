/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import { validateInternalRuleType } from '../../../../lib/validate_internal_rule_type';
import {
  unsnoozeBodyInternalSchema,
  unsnoozeParamsInternalSchema,
} from '../../../../../../common/routes/rule/apis/unsnooze';
import type { ILicenseState } from '../../../../../lib';
import { RuleMutedError } from '../../../../../lib';
import { verifyAccessAndContext } from '../../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../../types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../../../../types';
import { transformUnsnoozeBodyV1 } from './transforms';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../../constants';

export type UnsnoozeRuleRequestParamsV1 = TypeOf<typeof unsnoozeParamsInternalSchema>;

export const unsnoozeRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rule/{id}/_unsnooze`,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: { access: 'internal' },
      validate: {
        params: unsnoozeParamsInternalSchema,
        body: unsnoozeBodyInternalSchema,
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const alertingContext = await context.alerting;
        const rulesClient = await alertingContext.getRulesClient();
        const ruleTypes = alertingContext.listTypes();

        const params: UnsnoozeRuleRequestParamsV1 = req.params;
        const body = transformUnsnoozeBodyV1(req.body);
        try {
          const rule = await rulesClient.get({ id: params.id });

          validateInternalRuleType({
            ruleTypeId: rule.alertTypeId,
            ruleTypes,
            operationText: 'unsnooze',
          });

          await rulesClient.unsnooze({ ...params, ...body });
          return res.noContent();
        } catch (e) {
          if (e instanceof RuleMutedError) {
            return e.sendResponse(res);
          }
          throw e;
        }
      })
    )
  );
};
