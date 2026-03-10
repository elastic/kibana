/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { ILicenseState } from '../../../lib';
import { BASE_ACTION_API_PATH } from '../../../../common';
import type { ActionsRequestHandlerContext } from '../../../types';
import { verifyAccessAndContext } from '../../verify_access_and_context';
import { DEFAULT_ACTION_ROUTE_SECURITY } from '../../constants';

const paramsSchema = schema.object({
  id: schema.string({ minLength: 1 }),
});

const responseSchema = schema.object({
  connectorIdAvailable: schema.boolean(),
});

export const checkConnectorIdRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.get(
    {
      path: `${BASE_ACTION_API_PATH}/connector/{id}/_check_availability`,
      security: DEFAULT_ACTION_ROUTE_SECURITY,
      options: {
        access: 'public',
        summary: 'Check if a connector ID is available',
        tags: ['oas-tag:connectors'],
      },
      validate: {
        request: {
          params: paramsSchema,
        },
        response: {
          200: {
            body: () => responseSchema,
            description: 'Returns whether the connector ID is available.',
          },
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const actionsClient = (await context.actions).getActionsClient();
        const { id } = req.params;

        try {
          await actionsClient.get({ id, throwIfSystemAction: false });
          return res.ok({
            body: { connectorIdAvailable: false },
          });
        } catch (error) {
          if (error?.output?.statusCode === 404) {
            return res.ok({
              body: { connectorIdAvailable: true },
            });
          }
          throw error;
        }
      })
    )
  );
};
