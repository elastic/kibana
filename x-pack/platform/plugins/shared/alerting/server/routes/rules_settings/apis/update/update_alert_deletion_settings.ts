/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { UpdateAlertDeletionSettingsRequestBodyV1 } from '../../../../../common/routes/rules_settings/apis/update';
import { updateAlertDeletionSettingsBodySchemaV1 } from '../../../../../common/routes/rules_settings/apis/update';
import type { ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../../../types';
import { API_PRIVILEGES } from '../../../../../common';
import {
  transformAlertDeletionSettingsRequestV1,
  transformAlertDeletionSettingsToResponseV1,
} from '../../transforms';

export const updateAlertDeletionSettingsRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/settings/_alert_deletion`,
      validate: {
        body: updateAlertDeletionSettingsBodySchemaV1,
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
        const body = transformAlertDeletionSettingsRequestV1(req.body);
        const updatedAlertDeletionSettings = await rulesSettingsClient.alertDeletion().update(body);

        return res.ok(transformAlertDeletionSettingsToResponseV1(updatedAlertDeletionSettings));
      })
    )
  );
};
