/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { ILicenseState } from '../../../lib';
import { BASE_ACTION_API_PATH } from '../../../../common';
import type { ActionsRequestHandlerContext } from '../../../types';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import { connectorResponseSchemaV1 } from '../../../../common/routes/connector/response';
import { transformConnectorResponseV1 } from '../common_transforms';
import type {
  UpgradeConnectorBodyV1,
  UpgradeConnectorParamsV1,
} from '../../../../common/routes/connector/apis/upgrade';
import {
  upgradeConnectorBodySchemaV1,
  upgradeConnectorParamsSchemaV1,
} from '../../../../common/routes/connector/apis/upgrade';
import { DEFAULT_ACTION_ROUTE_SECURITY } from '../../constants';
import { errorHandler } from '../error_handler';

/**
 * POST /api/actions/connector/{id}/_upgrade
 *
 * Moves a spec connector to the catalog-active spec version. Validates the stored
 * configuration and secrets against the target before rewriting the pin.
 */
export const upgradeConnectorRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${BASE_ACTION_API_PATH}/connector/{id}/_upgrade`,
      security: DEFAULT_ACTION_ROUTE_SECURITY,
      options: {
        access: 'public',
        summary: 'Upgrade a connector to the active spec version',
        description:
          'Moves a spec-sourced connector to the catalog-active spec version. The stored configuration and secrets must validate against the target version.',
        tags: ['oas-tag:connectors'],
      },
      validate: {
        request: {
          params: upgradeConnectorParamsSchemaV1,
          body: upgradeConnectorBodySchemaV1,
        },
        response: {
          200: {
            description: 'Indicates a successful call.',
            body: () => connectorResponseSchemaV1,
          },
          400: {
            description:
              'The target is not the active version, the connector type is not spec-sourced, or the stored configuration does not validate against the target.',
          },
          403: {
            description: 'Indicates that this call is forbidden.',
          },
          404: {
            description: 'The connector does not exist.',
          },
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        try {
          const actionsClient = (await context.actions).getActionsClient();
          const { id }: UpgradeConnectorParamsV1 = req.params;
          const { spec_version: specVersion }: UpgradeConnectorBodyV1 = req.body;

          return res.ok({
            body: transformConnectorResponseV1(await actionsClient.upgrade({ id, specVersion })),
          });
        } catch (error) {
          return errorHandler(res, error);
        }
      })
    )
  );
};
