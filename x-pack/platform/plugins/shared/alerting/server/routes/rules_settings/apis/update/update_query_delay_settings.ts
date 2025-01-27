/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { ILicenseState } from '../../../../lib';
import { verifyAccessAndContext } from '../../../lib';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../../../../types';
import { API_PRIVILEGES } from '../../../../../common';
import {
  updateQueryDelaySettingsBodySchemaV1,
  UpdateQueryDelaySettingsRequestBodyV1,
  UpdateQueryDelaySettingsResponseV1,
} from '../../../../../common/routes/rules_settings/apis/update';
import { transformQueryDelaySettingsToResponseV1 } from '../../transforms';

export const updateQueryDelaySettingsRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/settings/_query_delay`,
      validate: {
        body: updateQueryDelaySettingsBodySchemaV1,
      },
      security: {
        authz: {
          requiredPrivileges: [`${API_PRIVILEGES.WRITE_QUERY_DELAY_SETTINGS}`],
        },
      },
      options: {
        access: 'internal',
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesSettingsClient = (await context.alerting).getRulesSettingsClient();

        const body: UpdateQueryDelaySettingsRequestBodyV1 = req.body;

        const updatedQueryDelaySettings = await rulesSettingsClient.queryDelay().update(body);

        const response: UpdateQueryDelaySettingsResponseV1 =
          transformQueryDelaySettingsToResponseV1(updatedQueryDelaySettings);

        return res.ok(response);
      })
    )
  );
};
