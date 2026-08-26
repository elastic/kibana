/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { INTERNAL_BASE_ACTION_API_PATH } from '../../../../common';
import {
  type UpgradeConnectorParamsV1,
  type UpgradeConnectorResponseV1,
  upgradeConnectorParamsSchemaV1,
  upgradeConnectorResponseSchemaV1,
} from '../../../../common/routes/connector/apis/upgrade';
import type { ILicenseState } from '../../../lib';
import type { ActionsRequestHandlerContext } from '../../../types';
import { DEFAULT_ACTION_ROUTE_SECURITY } from '../../constants';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import { transformConnectorResponseV1 } from '../common_transforms';

export const upgradeConnectorRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ACTION_API_PATH}/connector/{id}/_upgrade`,
      security: DEFAULT_ACTION_ROUTE_SECURITY,
      options: {
        access: 'internal',
        summary: 'Upgrade a declarative connector specification',
        tags: ['oas-tag:connectors'],
      },
      validate: {
        request: {
          params: upgradeConnectorParamsSchemaV1,
        },
        response: {
          200: {
            description: 'Connector upgrade result.',
            body: () => upgradeConnectorResponseSchemaV1,
          },
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const actionsClient = (await context.actions).getActionsClient();
        const { id }: UpgradeConnectorParamsV1 = req.params;
        const result = await actionsClient.upgrade({ id });
        const body: UpgradeConnectorResponseV1 = {
          status: result.status,
          from_version: result.fromVersion,
          to_version: result.toVersion,
          connector: transformConnectorResponseV1(result.connector),
        };

        return res.ok({ body });
      })
    )
  );
};
