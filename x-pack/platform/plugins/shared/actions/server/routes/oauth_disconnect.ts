/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { ILicenseState } from '../lib';
import { BASE_ACTION_API_PATH, type DisconnectOAuthPathParams } from '../../common';
import { disconnectOAuthPathParamsSchema } from '../../common/routes/connector/apis/oauth';
import type { ActionsRequestHandlerContext } from '../types';
import type { ActionsPluginsStart } from '../plugin';
import { DEFAULT_ACTION_ROUTE_SECURITY } from './constants';
import { verifyAccessAndContext } from './verify_access_and_context';
import { ConnectorTokenClient } from '../lib/connector_token_client';

export const oauthDisconnectRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState,
  logger: Logger,
  coreSetup: CoreSetup<ActionsPluginsStart>
) => {
  router.post(
    {
      path: `${BASE_ACTION_API_PATH}/connector/{connectorId}/_oauth_disconnect`,
      security: DEFAULT_ACTION_ROUTE_SECURITY,
      options: {
        access: 'internal',
        summary: i18n.translate('xpack.actions.oauthDisconnect.routeSummary', {
          defaultMessage: 'Disconnect OAuth authorization for a connector',
        }),
        description: i18n.translate('xpack.actions.oauthDisconnect.routeDescription', {
          defaultMessage:
            'Removes all stored OAuth access and refresh tokens for the specified connector, effectively disconnecting it from the authorization server.',
        }),
        tags: ['oas-tag:connectors'],
      },
      validate: {
        request: {
          params: disconnectOAuthPathParamsSchema,
        },
        response: {
          204: {
            description: i18n.translate('xpack.actions.oauthDisconnect.response204Description', {
              defaultMessage: 'Connector successfully disconnected from OAuth authorization.',
            }),
          },
          404: {
            description: i18n.translate('xpack.actions.oauthDisconnect.response404Description', {
              defaultMessage: 'Connector not found.',
            }),
          },
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const { connectorId }: DisconnectOAuthPathParams = req.params;
        const routeLogger = logger.get('oauth_disconnect');

        // Verify the connector exists and the user has access via the actions client
        const actionsClient = (await context.actions).getActionsClient();
        await actionsClient.get({ id: connectorId });

        const core = await context.core;
        const [, { encryptedSavedObjects }] = await coreSetup.getStartServices();
        const connectorTokenClient = new ConnectorTokenClient({
          encryptedSavedObjectsClient: encryptedSavedObjects.getClient({
            includedHiddenTypes: ['connector_token'],
          }),
          unsecuredSavedObjectsClient: core.savedObjects.getClient({
            includedHiddenTypes: ['connector_token'],
          }),
          logger: routeLogger,
        });

        await connectorTokenClient.deleteConnectorTokens({ connectorId });

        routeLogger.info(`OAuth tokens deleted for connector: ${connectorId}`);

        return res.noContent();
      })
    )
  );
};
