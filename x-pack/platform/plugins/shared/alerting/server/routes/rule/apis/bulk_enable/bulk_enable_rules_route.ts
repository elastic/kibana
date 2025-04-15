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
  BulkEnableRulesRequestBodyV1,
  BulkEnableRulesResponseV1,
} from '../../../../../common/routes/rule/apis/bulk_enable';
import { bulkEnableBodySchemaV1 } from '../../../../../common/routes/rule/apis/bulk_enable';
import type { RuleParamsV1 } from '../../../../../common/routes/rule/response';
import { transformBulkEnableResponseV1 } from './transforms';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../constants';

export const bulkEnableRulesRoute = ({
  router,
  licenseState,
}: {
  router: IRouter<AlertingRequestHandlerContext>;
  licenseState: ILicenseState;
}) => {
  router.patch(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/_bulk_enable`,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options: { access: 'internal' },
      validate: {
        body: bulkEnableBodySchemaV1,
      },
    },
    handleDisabledApiKeysError(
      router.handleLegacyErrors(
        verifyAccessAndContext(licenseState, async (context, req, res) => {
          const alertingContext = await context.alerting;
          const rulesClient = await alertingContext.getRulesClient();

          const body: BulkEnableRulesRequestBodyV1 = req.body;
          try {
            const result = await rulesClient.bulkEnableRules({
              filter: body.filter,
              ids: body.ids,
            });

            const response: BulkEnableRulesResponseV1<RuleParamsV1>['body'] =
              transformBulkEnableResponseV1<RuleParamsV1>(result);
            return res.ok({ body: response });
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
