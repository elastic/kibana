/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { AllConnectorsResponseV1 } from '../../../../common/routes/connector/response';
import type { ActionsRequestHandlerContext } from '../../../types';
import { INTERNAL_BASE_ACTION_API_PATH } from '../../../../common';
import type { ILicenseState } from '../../../lib';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import { transformGetAllConnectorsResponseV1 } from '../get_all/transforms';
import { DEFAULT_ACTION_ROUTE_SECURITY } from '../../constants';

export const getAllConnectorsIncludingSystemRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ACTION_API_PATH}/connectors`,
      security: DEFAULT_ACTION_ROUTE_SECURITY,
      validate: {},
      options: {
        access: 'internal',
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const actionsClient = (await context.actions).getActionsClient();
        const result = await actionsClient.getAll({
          includeSystemActions: true,
        });

        const responseBody: AllConnectorsResponseV1[] = transformGetAllConnectorsResponseV1(result);
        return res.ok({ body: responseBody });
      })
    )
  );
};
