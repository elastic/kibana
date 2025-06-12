/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { GetConnectorParamsV1 } from '../../../../common/routes/connector/apis/get';
import { getConnectorParamsSchemaV1 } from '../../../../common/routes/connector/apis/get';
import { connectorResponseSchemaV1 } from '../../../../common/routes/connector/response';
import { transformConnectorResponseV1 } from '../common_transforms';
import type { ILicenseState } from '../../../lib';
import { BASE_ACTION_API_PATH } from '../../../../common';
import type { ActionsRequestHandlerContext } from '../../../types';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import { DEFAULT_ACTION_ROUTE_SECURITY } from '../../constants';

export const getConnectorRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${BASE_ACTION_API_PATH}/connector/{id}`,
      security: DEFAULT_ACTION_ROUTE_SECURITY,
      options: {
        access: 'public',
        summary: `Get connector information`,
        tags: ['oas-tag:connectors'],
      },
      validate: {
        request: {
          params: getConnectorParamsSchemaV1,
        },
        response: {
          200: {
            body: () => connectorResponseSchemaV1,
            description: 'Indicates a successful call.',
          },
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const actionsClient = (await context.actions).getActionsClient();
        const { id }: GetConnectorParamsV1 = req.params;
        return res.ok({
          body: transformConnectorResponseV1(await actionsClient.get({ id })),
        });
      })
    )
  );
};
