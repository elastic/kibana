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
import type { DeleteConnectorRequestParamsV1 } from '../../../../common/routes/connector/apis/delete';
import { deleteConnectorRequestParamsSchemaV1 } from '../../../../common/routes/connector/apis/delete';
import { DEFAULT_ACTION_ROUTE_SECURITY } from '../../constants';

export const deleteConnectorRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.delete(
    {
      path: `${BASE_ACTION_API_PATH}/connector/{id}`,
      security: DEFAULT_ACTION_ROUTE_SECURITY,
      options: {
        access: 'public',
        summary: `Delete a connector`,
        description: 'WARNING: When you delete a connector, it cannot be recovered.',
        tags: ['oas-tag:connectors'],
      },
      validate: {
        request: {
          params: deleteConnectorRequestParamsSchemaV1,
        },
        response: {
          204: {
            description: 'Indicates a successful call.',
          },
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const actionsClient = (await context.actions).getActionsClient();
        const { id }: DeleteConnectorRequestParamsV1 = req.params;
        await actionsClient.delete({ id });
        return res.noContent();
      })
    )
  );
};
