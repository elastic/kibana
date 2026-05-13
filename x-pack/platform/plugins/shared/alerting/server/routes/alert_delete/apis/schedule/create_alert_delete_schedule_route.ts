/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, IRouter } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common/constants';
import Boom from '@hapi/boom';
import type { AlertingPluginsStart } from '../../../../plugin';
import { hasRequiredPrivilegeGrantedInAllSpaces } from '../../../../lib/has_required_privilege_granted_in_all_spaces';
import { alertDeleteScheduleQuerySchemaV1 } from '../../../../../common/routes/alert_delete';
import type { ILicenseState } from '../../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../../../types';
import { verifyAccessAndContext } from '../../../lib';
import { API_PRIVILEGES } from '../../../../../common';
import { transformRequestToAlertDeleteScheduleV1 } from '../../transforms';

export const alertDeleteScheduleRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState,
  core: CoreSetup<AlertingPluginsStart, unknown>
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/settings/_alert_delete_schedule`,
      validate: {
        body: alertDeleteScheduleQuerySchemaV1,
      },
      security: {
        authz: {
          requiredPrivileges: [`${API_PRIVILEGES.WRITE_ALERT_DELETE_SETTINGS}`],
        },
      },
      options: {
        access: 'internal',
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const alertingContext = await context.alerting;
        const { spaceIds, ...settings } = transformRequestToAlertDeleteScheduleV1(req.body);

        if (spaceIds && spaceIds.length > 0) {
          const [, { security }] = await core.getStartServices();
          const hasRequiredPrivilegeGranted = await hasRequiredPrivilegeGrantedInAllSpaces({
            request: req,
            spaceIds,
            requiredPrivilege: API_PRIVILEGES.WRITE_ALERT_DELETE_SETTINGS,
            authz: security?.authz,
          });

          if (!hasRequiredPrivilegeGranted) {
            throw Boom.forbidden(
              'Insufficient privileges to delete alerts in the specified spaces'
            );
          }
        }

        if (!settings.isActiveAlertDeleteEnabled && !settings.isInactiveAlertDeleteEnabled) {
          return res.badRequest({
            body: {
              message:
                'active_alert_delete_threshold or inactive_alert_delete_threshold must be set',
            },
          });
        }

        try {
          const message = await alertingContext
            .getAlertDeletionClient()
            .scheduleTask(
              req,
              settings,
              spaceIds && spaceIds.length > 0
                ? spaceIds
                : [(await alertingContext.getRulesClient()).getSpaceId() || DEFAULT_SPACE_ID]
            );
          return message ? res.ok({ body: message }) : res.noContent();
        } catch (error) {
          return res.customError({
            statusCode: 500,
            body: {
              message: error.message,
            },
          });
        }
      })
    )
  );
};
