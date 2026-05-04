/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { ILicenseState } from '../lib';
import { INTERNAL_BASE_ACTION_API_PATH, type DisconnectOAuthPathParams } from '../../common';
import { disconnectOAuthPathParamsSchema } from '../../common/routes/connector/apis/oauth';
import type { ActionsRequestHandlerContext } from '../types';
import type { ActionsPluginsStart } from '../plugin';
import { verifyAccessAndContext } from './verify_access_and_context';
import { UserConnectorTokenClient } from '../lib/user_connector_token_client';
import { OAUTH_API_TAG } from '../feature';

export const oauthDisconnectRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState,
  logger: Logger,
  coreSetup: CoreSetup<ActionsPluginsStart>
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ACTION_API_PATH}/connector/{connectorId}/_oauth_disconnect`,
      security: {
        authz: {
          requiredPrivileges: [OAUTH_API_TAG],
        },
      },
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

        const { security } = await context.core;
        const currentUser = security.authc.getCurrentUser();
        if (!currentUser) {
          return res.unauthorized({
            body: {
              message: 'User should be authenticated to disconnect OAuth authorization.',
            },
          });
        }
        const { profile_uid: profileUid } = currentUser;
        if (!profileUid) {
          return res.customError({
            statusCode: 500,
            body: {
              message: 'Unable to retrieve Kibana user profile ID.',
            },
          });
        }

        // Verify the connector exists and the user has access via the actions client
        const actionsClient = (await context.actions).getActionsClient();
        await actionsClient.get({ id: connectorId });

        const core = await context.core;
        const [, { encryptedSavedObjects }] = await coreSetup.getStartServices();
        const userConnectorTokenClient = new UserConnectorTokenClient({
          encryptedSavedObjectsClient: encryptedSavedObjects.getClient({
            includedHiddenTypes: ['user_connector_token'],
          }),
          unsecuredSavedObjectsClient: core.savedObjects.getClient({
            includedHiddenTypes: ['user_connector_token'],
          }),
          logger: routeLogger,
        });

        await userConnectorTokenClient.deleteConnectorTokens({ connectorId, profileUid });

        routeLogger.info(`OAuth tokens deleted for connector: ${connectorId}`);

        return res.noContent();
      })
    )
  );
};
