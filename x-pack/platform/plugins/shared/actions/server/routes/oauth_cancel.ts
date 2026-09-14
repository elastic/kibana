/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { ILicenseState } from '../lib';
import {
  INTERNAL_BASE_ACTION_API_PATH,
  type CancelOAuthPathParams,
  type CancelOAuthBody,
} from '../../common';
import {
  cancelOAuthPathParamsSchema,
  cancelOAuthBodySchema,
} from '../../common/routes/connector/apis/oauth';
import type { ActionsRequestHandlerContext } from '../types';
import type { ActionsPluginsStart } from '../plugin';
import { verifyAccessAndContext } from './verify_access_and_context';
import { OAuthStateClient } from '../lib/oauth_state_client';
import { OAUTH_API_TAG } from '../feature';
import { OAUTH_STATE_SAVED_OBJECT_TYPE } from '../constants/saved_objects';

export const oauthCancelRoute = (
  router: IRouter<ActionsRequestHandlerContext>,
  licenseState: ILicenseState,
  logger: Logger,
  coreSetup: CoreSetup<ActionsPluginsStart>
) => {
  const routeLogger = logger.get('oauth_cancel');
  router.post(
    {
      path: `${INTERNAL_BASE_ACTION_API_PATH}/connector/{connectorId}/_oauth_cancel`,
      security: {
        authz: {
          requiredPrivileges: [OAUTH_API_TAG],
        },
      },
      options: {
        access: 'internal',
        summary: i18n.translate('xpack.actions.oauthCancel.routeSummary', {
          defaultMessage: 'Cancel an in-progress OAuth authorization flow',
        }),
        description: i18n.translate('xpack.actions.oauthCancel.routeDescription', {
          defaultMessage:
            'Deletes the pending OAuth state record for the specified connector, preventing a still-open authorization tab from completing the flow.',
        }),
        tags: ['oas-tag:connectors'],
      },
      validate: {
        request: {
          params: cancelOAuthPathParamsSchema,
          body: cancelOAuthBodySchema,
        },
        response: {
          204: {
            description: i18n.translate('xpack.actions.oauthCancel.response204Description', {
              defaultMessage: 'OAuth authorization flow successfully cancelled.',
            }),
          },
          403: {
            description: i18n.translate('xpack.actions.oauthCancel.response403Description', {
              defaultMessage: 'The authorization flow was not initiated by the current user.',
            }),
          },
        },
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        const { connectorId }: CancelOAuthPathParams = req.params;
        const { state }: CancelOAuthBody = req.body;

        const { security, savedObjects } = await context.core;
        const currentUser = security.authc.getCurrentUser();
        if (!currentUser) {
          return res.unauthorized({
            body: {
              message: 'User should be authenticated to cancel OAuth authorization.',
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

        const actionsClient = (await context.actions).getActionsClient();
        await actionsClient.get({ id: connectorId });

        const [, { encryptedSavedObjects }] = await coreSetup.getStartServices();
        const oauthStateClient = new OAuthStateClient({
          encryptedSavedObjectsClient: encryptedSavedObjects.getClient({
            includedHiddenTypes: [OAUTH_STATE_SAVED_OBJECT_TYPE],
          }),
          unsecuredSavedObjectsClient: savedObjects.getClient({
            includedHiddenTypes: [OAUTH_STATE_SAVED_OBJECT_TYPE],
          }),
          logger: routeLogger,
        });

        const oauthState = await oauthStateClient.get(state);

        if (!oauthState) {
          // State not found or already expired — cancel is idempotent
          return res.noContent();
        }

        if (!oauthState.createdBy || oauthState.createdBy !== profileUid) {
          return res.forbidden({
            body: {
              message:
                'This authorization flow was not initiated by you. Only the user who started the flow can cancel it.',
            },
          });
        }

        await oauthStateClient.delete(oauthState.id);

        routeLogger.debug(
          `OAuth cancel: deleted state for connector ${connectorId}, user ${profileUid}`
        );
        return res.noContent();
      })
    )
  );
};
