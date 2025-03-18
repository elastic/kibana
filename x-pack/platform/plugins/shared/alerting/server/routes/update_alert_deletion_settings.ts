/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { ILicenseState } from '../lib';
import type { RewriteResponseCase, RewriteRequestCase } from './lib';
import { verifyAccessAndContext } from './lib';
import type { AlertingRequestHandlerContext } from '../types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../types';
import type {
  RulesSettingsAlertDeletion,
  RulesSettingsAlertDeletionProperties,
} from '../../common';
import { API_PRIVILEGES } from '../../common';

const bodySchema = schema.object({
  is_active_alerts_deletion_enabled: schema.boolean(),
  is_inactive_alerts_deletion_enabled: schema.boolean(),
  active_alerts_deletion_threshold: schema.number(),
  inactive_alerts_deletion_threshold: schema.number(),
});

const rewriteQueryReq: RewriteRequestCase<RulesSettingsAlertDeletionProperties> = ({
  is_active_alerts_deletion_enabled: isActiveAlertsDeletionEnabled,
  is_inactive_alerts_deletion_enabled: isInactiveAlertsDeletionEnabled,
  active_alerts_deletion_threshold: activeAlertsDeletionThreshold,
  inactive_alerts_deletion_threshold: inactiveAlertsDeletionThreshold,
}) => ({
  isActiveAlertsDeletionEnabled,
  isInactiveAlertsDeletionEnabled,
  activeAlertsDeletionThreshold,
  inactiveAlertsDeletionThreshold,
});

const rewriteBodyRes: RewriteResponseCase<RulesSettingsAlertDeletion> = ({
  isActiveAlertsDeletionEnabled,
  isInactiveAlertsDeletionEnabled,
  activeAlertsDeletionThreshold,
  inactiveAlertsDeletionThreshold,
  createdBy,
  updatedBy,
  createdAt,
  updatedAt,
}) => ({
  is_active_alerts_deletion_enabled: isActiveAlertsDeletionEnabled,
  is_inactive_alerts_deletion_enabled: isInactiveAlertsDeletionEnabled,
  active_alerts_deletion_threshold: activeAlertsDeletionThreshold,
  inactive_alerts_deletion_threshold: inactiveAlertsDeletionThreshold,
  created_by: createdBy,
  updated_by: updatedBy,
  created_at: createdAt,
  updated_at: updatedAt,
});

export const updateAlertDeletionSettingsRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/settings/_alert_deletion`,
      validate: {
        body: bodySchema,
      },
      security: {
        authz: {
          requiredPrivileges: [`${API_PRIVILEGES.WRITE_ALERT_DELETION_SETTINGS}`],
        },
      },
      options: {
        access: 'internal',
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesSettingsClient = (await context.alerting).getRulesSettingsClient();

        const updatedAlertDeletionSettings = await rulesSettingsClient
          .alertDeletion()
          .update(rewriteQueryReq(req.body));

        return res.ok({
          body: updatedAlertDeletionSettings && rewriteBodyRes(updatedAlertDeletionSettings),
        });
      })
    )
  );
};
