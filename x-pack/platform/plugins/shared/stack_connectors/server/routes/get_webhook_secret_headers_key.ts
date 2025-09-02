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
  Logger,
} from '@kbn/core/server';
import type { StartServicesAccessor } from '@kbn/core/server';

import type { PluginStartContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';

import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import { INTERNAL_BASE_STACK_CONNECTORS_API_PATH } from '../../common';

export interface ConnectorsPluginsStart {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  actions: ActionsPluginSetupContract;
}

export interface ConnectorAttributes {
  secrets?: {
    secretHeaders?: Array<{ key: string; value: string; type: string }>;
  };
}

const querySchema = schema.object({
  connectorId: schema.string(),
});

export const getWebhookSecretHeadersKeyRoute = (
  router: IRouter,
  logger: Logger,
  getStartServices: StartServicesAccessor<ConnectorsPluginsStart, unknown>
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_STACK_CONNECTORS_API_PATH}/_secret_headers`,
      security: {
        authz: {
          enabled: false,
          reason:
            'This route is opted out from authorization as returning headers does not require any.',
        },
      },
      validate: {
        query: querySchema,
      },
      options: {
        access: 'internal',
      },
    },
    async (
      ctx: RequestHandlerContext,
      req: KibanaRequest<unknown, { connectorId: string }, unknown>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse> => {
      const { connectorId } = req.query;

      const [, { encryptedSavedObjects }] = await getStartServices();

      const encryptedClient = encryptedSavedObjects.getClient({
        includedHiddenTypes: ['action'],
      });

      const decryptedConnector =
        await encryptedClient.getDecryptedAsInternalUser<ConnectorAttributes>(
          'action',
          connectorId
        );

      const secretHeaders = decryptedConnector.attributes.secrets?.secretHeaders || [];

      const secretHeadersArray = Object.keys(secretHeaders).map((key) => ({
        key,
        value: '', // always empty
      }));

      return res.ok({ body: { secretHeaders: secretHeadersArray } });
    }
  );
};
