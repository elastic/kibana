/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type {
  FindRuleTemplatesRequestQueryV1,
  FindRuleTemplatesResponseV1,
} from '../../../../../common/routes/rule_template/apis/find';
import { findRuleTemplatesRequestQuerySchemaV1 } from '../../../../../common/routes/rule_template/apis/find';
import type { ILicenseState } from '../../../../lib';
import {
  INTERNAL_BASE_ALERTING_API_PATH,
  type AlertingRequestHandlerContext,
} from '../../../../types';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../constants';
import { verifyAccessAndContext } from '../../../lib';
import {
  transformFindRuleTemplatesQueryV1,
  transformFindRuleTemplatesResponseV1,
} from './transforms';

export const findInternalRuleTemplatesRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rule_template/_find`,
      options: { access: 'internal' },
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      validate: {
        request: {
          query: findRuleTemplatesRequestQuerySchemaV1,
        },
        response: {
          200: {
            description: 'Indicates a successful call.',
          },
          400: {
            description: 'Indicates an invalid schema or parameters.',
          },
          403: {
            description: 'Indicates that this call is forbidden.',
          },
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const alertingContext = await context.alerting;
        const rulesClient = await alertingContext.getRulesClient();
        const query: FindRuleTemplatesRequestQueryV1 = req.query;

        const result = await rulesClient.findTemplates(transformFindRuleTemplatesQueryV1(query));
        const response: { body: FindRuleTemplatesResponseV1 } = {
          body: transformFindRuleTemplatesResponseV1(result),
        };
        return res.ok(response);
      })
    )
  );
};
