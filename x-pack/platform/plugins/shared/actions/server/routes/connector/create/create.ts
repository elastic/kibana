/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { errorHandler } from '../error_handler';
import type { ActionsRequestHandlerContext } from '../../../types';
import type { ILicenseState } from '../../../lib';
import { BASE_ACTION_API_PATH } from '../../../../common';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import { connectorResponseSchemaV1 } from '../../../../common/routes/connector/response';
import { transformConnectorResponseV1 } from '../common_transforms';
import {
  createConnectorRequestParamsSchemaV1,
  createConnectorRequestBodySchemaV1,
} from '../../../../common/routes/connector/apis/create';
import { transformCreateConnectorBodyV1 } from './transforms';
import { DEFAULT_ACTION_ROUTE_SECURITY } from '../../constants';

export const createConnectorRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${BASE_ACTION_API_PATH}/connector/{id?}`,
      security: DEFAULT_ACTION_ROUTE_SECURITY,
      options: {
        access: 'public',
        summary: 'Create a connector',
        tags: ['oas-tag:connectors'],
      },
      validate: {
        request: {
          params: createConnectorRequestParamsSchemaV1,
          body: createConnectorRequestBodySchemaV1,
        },
        response: {
          200: {
            description: 'Indicates a successful call.',
            body: () => connectorResponseSchemaV1,
          },
          403: {
            description: 'Indicates that this call is forbidden.',
          },
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        try {
          const actionsClient = (await context.actions).getActionsClient();
          const action = transformCreateConnectorBodyV1(req.body);
          const resp = await actionsClient.create({ action, options: req.params });
          const body = transformConnectorResponseV1(resp);

          return res.ok({
            body,
          });
        } catch (error) {
          return errorHandler(res, error);
        }
      })
    )
  );
};
