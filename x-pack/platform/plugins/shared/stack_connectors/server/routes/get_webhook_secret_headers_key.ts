/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type {
  IRouter,
  RequestHandlerContext,
  KibanaRequest,
  IKibanaResponse,
  KibanaResponseFactory,
} from '@kbn/core/server';
import type { StartServicesAccessor } from '@kbn/core/server';
import { ACTION_SAVED_OBJECT_TYPE } from '@kbn/actions-plugin/server';
import { isBoom } from '@hapi/boom';

import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';

import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import type { SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import { INTERNAL_BASE_STACK_CONNECTORS_API_PATH } from '../../common';

export interface ConnectorsPluginsStart {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  actions: ActionsPluginStartContract;
  spaces: SpacesPluginSetup;
}

export interface ConnectorAttributes {
  secrets?: {
    secretHeaders?: Array<{ key: string; value: string; type: string }>;
  };
  actionTypeId: string;
}

export const getWebhookSecretHeadersKeyRoute = (
  router: IRouter,
  getStartServices: StartServicesAccessor<ConnectorsPluginsStart, unknown>
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_STACK_CONNECTORS_API_PATH}/{id}/secret_headers`,
      security: {
        authz: {
          enabled: false,
          reason:
            'This route is opted out from authorization because it relies on the authorization model inside the actions client.',
        },
      },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
      options: {
        access: 'internal',
      },
    },
    async (
      ctx: RequestHandlerContext,
      req: KibanaRequest<{ id: string }, unknown, unknown>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse> => {
      try {
        const { id } = req.params;

        const [, { encryptedSavedObjects, actions, spaces }] = await getStartServices();

        const actionsClient = await actions.getActionsClientWithRequest(req);
        const connector = await actionsClient.get({ id });
        const spaceId = spaces.spacesService.getSpaceId(req);

        const allowedConnectorTypes = ['.webhook', '.cases-webhook', '.mcp'];

        if (!allowedConnectorTypes.includes(connector.actionTypeId)) {
          return res.badRequest({
            body: {
              message: `Connector must be one of the following types: ${allowedConnectorTypes.join(
                ', '
              )}`,
            },
          });
        }
        const encryptedClient = encryptedSavedObjects.getClient({
          includedHiddenTypes: [ACTION_SAVED_OBJECT_TYPE],
        });
        const decryptedConnector =
          await encryptedClient.getDecryptedAsInternalUser<ConnectorAttributes>(
            ACTION_SAVED_OBJECT_TYPE,
            id,
            { namespace: spaceId }
          );
        const secretHeaders = decryptedConnector.attributes.secrets?.secretHeaders || {};

        const secretHeadersArray = Object.keys(secretHeaders) || [];

        return res.ok({ body: secretHeadersArray });
      } catch (error) {
        if (isBoom(error)) {
          return res.customError({
            statusCode: error.output.statusCode,
            body: { message: error.output.payload.message },
          });
        }

        return res.customError({
          statusCode: 500,
          body: { message: error.message },
        });
      }
    }
  );
};
