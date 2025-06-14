/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { verifyAccessAndContext, handleDisabledApiKeysError } from '../../../lib';
import type { ILicenseState } from '../../../../lib';
import { RuleTypeDisabledError } from '../../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../../../types';
import type {
  BulkDeleteRulesRequestBodyV1,
  BulkDeleteRulesResponseV1,
} from '../../../../../common/routes/rule/apis/bulk_delete';
import { bulkDeleteRulesRequestBodySchemaV1 } from '../../../../../common/routes/rule/apis/bulk_delete';
import type { RuleParamsV1 } from '../../../../../common/routes/rule/response';
import { transformRuleToRuleResponseV1 } from '../../transforms';
import type { Rule } from '../../../../application/rule/types';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../constants';

export const bulkDeleteRulesRoute = ({
  router,
  licenseState,
}: {
  router: IRouter<AlertingRequestHandlerContext>;
  licenseState: ILicenseState;
}) => {
  router.patch(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/_bulk_delete`,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: { access: 'internal' },
      validate: {
        body: bulkDeleteRulesRequestBodySchemaV1,
      },
    },
    handleDisabledApiKeysError(
      router.handleLegacyErrors(
        verifyAccessAndContext(licenseState, async (context, req, res) => {
          const alertingContext = await context.alerting;
          const rulesClient = await alertingContext.getRulesClient();

          const body: BulkDeleteRulesRequestBodyV1 = req.body;
          const { filter, ids } = body;

          try {
            const bulkDeleteResult = await rulesClient.bulkDeleteRules({
              filter,
              ids,
            });
            const resultBody: BulkDeleteRulesResponseV1<RuleParamsV1> = {
              body: {
                ...bulkDeleteResult,
                rules: bulkDeleteResult.rules.map((rule) => {
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
