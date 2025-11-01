/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { ILicenseState } from '../../../lib';

import type { ActionsRequestHandlerContext } from '../../../types';
import { BASE_ACTION_API_PATH } from '../../../../common';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import { connectorResponseSchemaV1 } from '../../../../common/routes/connector/response';
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
          params: schema.object({
            id: schema.string({
              meta: {
                description: 'An identifier for the connector.',
              },
            }),
          }),
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
        const { id } = req.params;

        try {
          const axiosInstance = await actionsClient.getAxiosInstance({
            actionId: id,
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
