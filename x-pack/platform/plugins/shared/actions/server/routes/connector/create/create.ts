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
import { getConnectorResponseSchemaV1 } from '../../../../common/routes/connector/response';
import { transformConnectorResponseV1 } from '../common_transforms';
import {
  createConnectorRequestParamsSchemaV1,
  getCreateConnectorRequestBodySchemaV1,
} from '../../../../common/routes/connector/apis/create';
import { transformCreateConnectorBodyV1 } from './transforms';
import { DEFAULT_ACTION_ROUTE_SECURITY } from '../../constants';
import type { ActionsConfigurationUtilities } from '../../../actions_config';

export const createConnectorRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState,
  actionsConfigUtils: ActionsConfigurationUtilities
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
      validate: () => {
        const includeInboundEventsField = actionsConfigUtils.isInboundEventsEnabled();
        const includeSpecVersionField = actionsConfigUtils.isCatalogEnabled();
        return {
          request: {
            params: createConnectorRequestParamsSchemaV1,
            body: getCreateConnectorRequestBodySchemaV1(
              includeInboundEventsField,
              includeSpecVersionField
            ),
          },
          response: {
            200: {
              description: 'Indicates a successful call.',
              body: () =>
                getConnectorResponseSchemaV1(includeInboundEventsField, includeSpecVersionField),
            },
            403: {
              description: 'Indicates that this call is forbidden.',
            },
          },
        };
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        try {
          const actions = await context.actions;
          const actionsClient = actions.getActionsClient();
          try {
            getCreateConnectorRequestBodySchemaV1(
              actionsConfigUtils.isInboundEventsEnabled(),
              actions.isCatalogFeatureFlagEnabled()
            ).validate(req.body, {}, 'request body');
          } catch (error) {
            return res.badRequest({
              body: error.message,
            });
          }

          const action = transformCreateConnectorBodyV1(req.body);
          const resp = await actionsClient.create({
            action,
            options: req.params,
          });
          const body = transformConnectorResponseV1(resp, {
            includeInboundEventsField: actionsConfigUtils.isInboundEventsEnabled(),
            includeSpecVersionField:
              actionsConfigUtils.isCatalogEnabled() && actions.isCatalogFeatureFlagEnabled(),
          });

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
