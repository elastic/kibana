/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { ILicenseState } from '../lib';
import { INTERNAL_BASE_ACTION_API_PATH, type DisconnectOAuthPathParams } from '../../common';
import { disconnectOAuthPathParamsSchema } from '../../common/routes/connector/apis/oauth';
import type { ActionsRequestHandlerContext } from '../types';
import type { ActionsPluginsStart } from '../plugin';
import { DEFAULT_ACTION_ROUTE_SECURITY } from './constants';
import { verifyAccessAndContext } from './verify_access_and_context';
import { UserConnectorTokenClient } from '../lib/user_connector_token_client';
import { request } from '../lib/axios_utils';
import type { ActionsConfigurationUtilities } from '../actions_config';

export const oauthDisconnectRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState,
  logger: Logger,
  coreSetup: CoreSetup<ActionsPluginsStart>,
  configurationUtilities: ActionsConfigurationUtilities
) => {
  router.post(
    {
      path: `${INTERNAL_BASE_ACTION_API_PATH}/connector/{connectorId}/_oauth_disconnect`,
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

        // For EARS connectors, revoke tokens at the provider before deleting them locally
        const rawAction = await encryptedSavedObjects
          .getClient({ includedHiddenTypes: ['action'] })
          .getDecryptedAsInternalUser<{ secrets: { authType?: string; provider?: string } }>(
            'action',
            connectorId
          );
        const { authType, provider } = rawAction.attributes.secrets;

        if (authType === 'ears' && provider) {
          const earsBaseUrl = configurationUtilities.getEarsUrl();
          if (earsBaseUrl) {
            const revokeUrl = `${earsBaseUrl.replace(/\/$/, '')}/${provider}/oauth/revoke`;
            const { connectorToken } = await userConnectorTokenClient.getOAuthPersonalToken({
              connectorId,
              profileUid,
            });

            if (connectorToken?.credentials) {
              const { accessToken, refreshToken } = connectorToken.credentials;
              const rawAccessToken = accessToken.replace(/^Bearer\s+/i, '');
              const axiosInstance = axios.create();
              const tokensToRevoke = [rawAccessToken, ...(refreshToken ? [refreshToken] : [])];

              const results = await Promise.allSettled(
                tokensToRevoke.map((token) =>
                  request({
                    axios: axiosInstance,
                    url: revokeUrl,
                    method: 'post',
                    logger: routeLogger,
                    data: { token },
                    headers: { 'Content-Type': 'application/json' },
                    configurationUtilities,
                    validateStatus: () => true,
                  })
                )
              );

              results.forEach((result, i) => {
                if (result.status === 'rejected') {
                  routeLogger.warn(
                    `Failed to revoke EARS token[${i}] for connector ${connectorId}: ${result.reason}`
                  );
                }
              });
            }
          }
        }

        await userConnectorTokenClient.deleteConnectorTokens({ connectorId, profileUid });

        routeLogger.info(`OAuth tokens deleted for connector: ${connectorId}`);

        return res.noContent();
      })
    )
  );
};
