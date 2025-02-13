/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import {
  PreviewRuleRequestBodyV1,
  previewBodySchemaV1,
} from '../../../../../common/routes/rule/apis/preview';
import type { CreateRuleResponseV1 } from '../../../../../common/routes/rule/apis/create';
import { RuleParamsV1 } from '../../../../../common/routes/rule/response';
import { Rule } from '../../../../application/rule/types';
import { ILicenseState, RuleTypeDisabledError } from '../../../../lib';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../../../../types';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../constants';
import { handleDisabledApiKeysError, verifyAccessAndContext } from '../../../lib';
import { transformRuleToRuleResponseV1 } from '../../transforms';
import { transformPreviewBodyV1 } from './transforms';

export const previewRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/_preview`,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: {
        access: 'internal',
        summary: `Preview a rule`,
      },
      validate: {
        request: {
          body: previewBodySchemaV1,
        },
      },
    },
    handleDisabledApiKeysError(
      router.handleLegacyErrors(
        verifyAccessAndContext(licenseState, async function (context, req, res) {
          const alertingContext = await context.alerting;
          const rulesClient = await alertingContext.getRulesClient();

          // Assert versioned inputs
          const previewRuleData: PreviewRuleRequestBodyV1<RuleParamsV1> = req.body;

          try {
            const createdRule: Rule<RuleParamsV1> = (await rulesClient.preview<RuleParamsV1>({
              data: transformPreviewBodyV1<RuleParamsV1>(previewRuleData),
            })) as Rule<RuleParamsV1>;

            // Assert versioned response type
            const response: CreateRuleResponseV1<RuleParamsV1> = {
              body: transformRuleToRuleResponseV1<RuleParamsV1>(createdRule),
            };

            return res.ok(response);
          } catch (e) {
            if (e instanceof RuleTypeDisabledError) {
              return e.sendResponse(res);
            }
            throw e;
          }
        })
      )
    )
  );
};
