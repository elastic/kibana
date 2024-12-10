/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { ILicenseState, RuleTypeDisabledError } from '../../../../lib';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../../../../types';
import { handleDisabledApiKeysError, verifyAccessAndContext } from '../../../lib';

import {
  bulkDisableRulesRequestBodySchemaV1,
  BulkDisableRulesRequestBodyV1,
  BulkDisableRulesResponseV1,
} from '../../../../../common/routes/rule/apis/bulk_disable';
import type { RuleParamsV1 } from '../../../../../common/routes/rule/response';
import { Rule } from '../../../../application/rule/types';
import { transformRuleToRuleResponseV1 } from '../../transforms';

export const bulkDisableRulesRoute = ({
  router,
  licenseState,
}: {
  router: IRouter<AlertingRequestHandlerContext>;
  licenseState: ILicenseState;
}) => {
  router.patch(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/_bulk_disable`,
      options: { access: 'internal' },
      validate: {
        body: bulkDisableRulesRequestBodySchemaV1,
      },
    },
    handleDisabledApiKeysError(
      router.handleLegacyErrors(
        verifyAccessAndContext(licenseState, async (context, req, res) => {
          const alertingContext = await context.alerting;
          const rulesClient = await alertingContext.getRulesClient();

          const body: BulkDisableRulesRequestBodyV1 = req.body;
          const { filter, ids, untrack } = body;

          try {
            const bulkDisableResults = await rulesClient.bulkDisableRules({ filter, ids, untrack });

            const resultBody: BulkDisableRulesResponseV1<RuleParamsV1> = {
              body: {
                ...bulkDisableResults,
                rules: bulkDisableResults.rules.map((rule) => {
                  // TODO (http-versioning): Remove this cast, this enables us to move forward
                  // without fixing all of other solution types
                  return transformRuleToRuleResponseV1<RuleParamsV1>(rule as Rule<RuleParamsV1>);
                }),
              },
            };

            return res.ok(resultBody);
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
