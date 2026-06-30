/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, RouteConfigOptions, RouteMethod } from '@kbn/core/server';
import { ReservedPrivilegesSet } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import type { ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import type { DeleteRuleRequestParamsV1 } from '../../../../../common/routes/rule/apis/delete';
import { deleteRuleRequestParamsSchemaV1 } from '../../../../../common/routes/rule/apis/delete';
import type { AlertingRequestHandlerContext } from '../../../../types';
import { BASE_ALERTING_API_PATH, INTERNAL_BASE_ALERTING_API_PATH } from '../../../../types';
import { DEFAULT_ALERTING_ROUTE_SECURITY } from '../../../constants';
import { validateInternalRuleType } from '../../../lib/validate_internal_rule_type';

interface BuildDeleteRuleRouteParams {
  licenseState: ILicenseState;
  path: string;
  router: IRouter<AlertingRequestHandlerContext>;
  options: RouteConfigOptions<RouteMethod>;
  security: RouteSecurity;
  /**
   * When true, the route synchronously invalidates the rule's API keys instead of
   * queuing them for the background invalidation task. Reserved for the internal
   * superuser route — used by test cleanup helpers to avoid the
   * `xpack.alerting.invalidateApiKeysTask.removalDelay` (default 1h) wait that
   * would otherwise let UIAM keys accumulate between test runs.
   */
  invalidateApiKeyNow?: boolean;
}

const buildDeleteRuleRoute = ({
  licenseState,
  path,
  router,
  options,
  security,
  invalidateApiKeyNow = false,
}: BuildDeleteRuleRouteParams) => {
  router.delete(
    {
      path,
      security,
      options,
      validate: {
        request: {
          params: deleteRuleRequestParamsSchemaV1,
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

        const rule = await rulesClient.get({ id: params.id });

        validateInternalRuleType({
          ruleTypeId: rule.alertTypeId,
          ruleTypes,
          operationText: 'delete',
        });

        await rulesClient.delete({
          id: params.id,
          ...(invalidateApiKeyNow ? { invalidateApiKeyNow: true } : {}),
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
    security: DEFAULT_ALERTING_ROUTE_SECURITY,
    options: {
      access: 'public',
      summary: `Delete a rule`,
      tags: ['oas-tag:alerting'],
    },
  });

export const internalDeleteRuleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) =>
  buildDeleteRuleRoute({
    licenseState,
    path: `${INTERNAL_BASE_ALERTING_API_PATH}/rule/{id}`,
    router,
    // Superuser-only: this route exists exclusively as an admin / test-cleanup
    // escape hatch that synchronously invalidates the rule's API keys.
    security: {
      authz: {
        requiredPrivileges: [ReservedPrivilegesSet.superuser],
      },
    },
    options: { access: 'internal' },
    invalidateApiKeyNow: true,
  });
