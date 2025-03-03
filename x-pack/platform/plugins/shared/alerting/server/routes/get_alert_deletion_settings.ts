/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { ILicenseState } from '../lib';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../types';
import { verifyAccessAndContext, RewriteResponseCase } from './lib';
import { API_PRIVILEGES, RulesSettingsAlertDeletion } from '../../common';

const rewriteBodyRes: RewriteResponseCase<RulesSettingsAlertDeletion> = ({
  activeAlertsDeletionThreshold,
  isActiveAlertsDeletionEnabled,
  inactiveAlertsDeletionThreshold,
  createdBy,
  isInactiveAlertsDeletionEnabled,
  updatedBy,
  createdAt,
  updatedAt,
}) => ({
  active_alerts_deletion_threshold: activeAlertsDeletionThreshold,
  is_active_alerts_deletion_enabled: isActiveAlertsDeletionEnabled,
  inactive_alerts_deletion_threshold: inactiveAlertsDeletionThreshold,
  is_inactive_alerts_deletion_enabled: isInactiveAlertsDeletionEnabled,
  created_at: createdAt,
  created_by: createdBy,
  updated_at: updatedAt,
  updated_by: updatedBy,
});

export const getAlertDeletionSettingsRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/settings/_alert_deletion`,
      validate: false,
      security: {
        authz: {
          requiredPrivileges: [`${API_PRIVILEGES.READ_ALERT_DELETION_SETTINGS}`],
        },
      },
      options: {
        access: 'internal',
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesSettingsClient = (await context.alerting).getRulesSettingsClient();
        const alertDeletionSettings = await rulesSettingsClient.alertDeletion().get();
        return res.ok({ body: rewriteBodyRes(alertDeletionSettings) });
      })
    )
  );
};
