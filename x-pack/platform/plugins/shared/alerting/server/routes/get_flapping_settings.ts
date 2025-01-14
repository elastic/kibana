/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type IRouter } from '@kbn/core/server';
import { type ILicenseState } from '../lib';
import { type AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../types';
import { verifyAccessAndContext, type RewriteResponseCase } from './lib';
import { API_PRIVILEGES, type RulesSettingsFlapping } from '../../common';

const rewriteBodyRes: RewriteResponseCase<RulesSettingsFlapping> = ({
  lookBackWindow,
  statusChangeThreshold,
  createdBy,
  updatedBy,
  createdAt,
  updatedAt,
  ...rest
}) => ({
  ...rest,
  look_back_window: lookBackWindow,
  status_change_threshold: statusChangeThreshold,
  created_by: createdBy,
  updated_by: updatedBy,
  created_at: createdAt,
  updated_at: updatedAt,
});

export const getFlappingSettingsRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/rules/settings/_flapping`,
      validate: false,
      security: {
        authz: {
          requiredPrivileges: [`${API_PRIVILEGES.READ_FLAPPING_SETTINGS}`],
        },
      },
      options: {
        access: 'internal',
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const rulesSettingsClient = (await context.alerting).getRulesSettingsClient();
        const flappingSettings = await rulesSettingsClient.flapping().get();
        return res.ok({ body: rewriteBodyRes(flappingSettings) });
      })
    )
  );
};
