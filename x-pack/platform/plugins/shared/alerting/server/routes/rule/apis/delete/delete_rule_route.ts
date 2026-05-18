/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, RouteConfigOptions, RouteMethod } from '@kbn/core/server';
import type { ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import type {
  DeleteRuleRequestParamsV1,
  DeleteRuleRequestQueryV1,
} from '../../../../../common/routes/rule/apis/delete';
import {
  deleteRuleRequestParamsSchemaV1,
  deleteRuleRequestQuerySchemaV1,
} from '../../../../../common/routes/rule/apis/delete';
import type { AlertingRequestHandlerContext } from '../../../../types';
import { BASE_ALERTING_API_PATH, INTERNAL_BASE_ALERTING_API_PATH } from '../../../../types';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../constants';
import { validateInternalRuleType } from '../../../lib/validate_internal_rule_type';

interface BuildDeleteRuleRouteParams {
  licenseState: ILicenseState;
  path: string;
  router: IRouter<AlertingRequestHandlerContext>;
  options: RouteConfigOptions<RouteMethod>;
  /**
   * When true, the route accepts an `invalidate_api_key_now` query param that
   * triggers synchronous invalidation of the rule's API keys. Reserved for the
   * internal route only — it is an admin / test-cleanup escape hatch and is
   * intentionally excluded from the public REST surface.
   */
  supportsInvalidateApiKeyNow?: boolean;
}

const buildDeleteRuleRoute = ({
  licenseState,
  path,
  router,
  options,
  supportsInvalidateApiKeyNow = false,
}: BuildDeleteRuleRouteParams) => {
  router.delete(
    {
      path,
      security: DEFAULT_ALERTING_ROUTE_SECURITY,
      options,
      validate: {
        request: {
          params: deleteRuleRequestParamsSchemaV1,
          ...(supportsInvalidateApiKeyNow ? { query: deleteRuleRequestQuerySchemaV1 } : {}),
        },
        response: {
          204: {
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
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const alertingContext = await context.alerting;
        const rulesClient = await alertingContext.getRulesClient();
        const ruleTypes = alertingContext.listTypes();

        const params: DeleteRuleRequestParamsV1 = req.params;
        const invalidateApiKeyNow = supportsInvalidateApiKeyNow
          ? (req.query as DeleteRuleRequestQueryV1 | undefined)?.invalidate_api_key_now
          : undefined;

        const rule = await rulesClient.get({ id: params.id });

        validateInternalRuleType({
          ruleTypeId: rule.alertTypeId,
          ruleTypes,
          operationText: 'delete',
        });

        await rulesClient.delete({
          id: params.id,
          ...(supportsInvalidateApiKeyNow ? { invalidateApiKeyNow } : {}),
        });
        return res.noContent();
      })
    )
  );
};

export const deleteRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) =>
  buildDeleteRuleRoute({
    licenseState,
    path: `${BASE_ALERTING_API_PATH}/rule/{id}`,
    router,
    options: {
      access: 'public',
      summary: `Delete a rule`,
      tags: ['oas-tag:alerting'],
    },
  });

export const deleteInternalRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) =>
  buildDeleteRuleRoute({
    licenseState,
    path: `${INTERNAL_BASE_ALERTING_API_PATH}/rule/{id}`,
    router,
    options: { access: 'internal' },
    supportsInvalidateApiKeyNow: true,
  });
