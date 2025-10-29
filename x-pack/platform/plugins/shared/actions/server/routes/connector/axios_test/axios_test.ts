/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { ILicenseState } from '../../../lib';

import type { ActionsRequestHandlerContext } from '../../../types';
import { BASE_ACTION_API_PATH } from '../../../../common';
import { asHttpRequestExecutionSource } from '../../../lib/action_execution_source';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import { connectorResponseSchemaV1 } from '../../../../common/routes/connector/response';
import type { ExecuteConnectorRequestParamsV1 } from '../../../../common/routes/connector/apis/execute';
import { executeConnectorRequestParamsSchemaV1 } from '../../../../common/routes/connector/apis/execute';
import { DEFAULT_ACTION_ROUTE_SECURITY } from '../../constants';

export const axiosTestRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.post(
    {
      path: `${BASE_ACTION_API_PATH}/connector/{id}/_axios_test`,
      security: DEFAULT_ACTION_ROUTE_SECURITY,
      options: {
        access: 'public',
        summary: `Foobar`,
        description: 'Foobar',
        tags: ['oas-tag:connectors'],
      },
      validate: {
        request: {
          params: executeConnectorRequestParamsSchemaV1,
        },
        response: {
          204: {
            description: 'Indicates a successful call.',
            body: () => connectorResponseSchemaV1,
          },
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const actionsClient = (await context.actions).getActionsClient();
        const { id }: ExecuteConnectorRequestParamsV1 = req.params;

        if (actionsClient.isSystemAction(id)) {
          return res.badRequest({ body: 'Execution of system action is not allowed' });
        }
        try {
          const axiosInstance = await actionsClient.getAxiosInstance({
            params: {},
            actionId: id,
            source: asHttpRequestExecutionSource(req),
            relatedSavedObjects: [],
          });

          // @ts-ignore
          await axiosInstance();

          return res.noContent();
        } catch (error) {
          return error;
        }
      })
    )
  );
};
