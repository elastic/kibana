/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import { ReservedPrivilegesSet } from '@kbn/core/server';
import type { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { lazySchema, z } from '@kbn/zod/v4';
import { isGenerateConnectorTypeError } from '../generate_connector_type/types';
import { fetchConnectorTypeLogo } from './fetch_logo';

const connectorTypeLogoBodySchema = lazySchema(() =>
  z
    .object({
      url: z.string().url().max(2048),
    })
    .strict()
);

/** Registers the internal route that reads a connector type's logo from an image URL. */
export const createConnectorTypeLogoRoute = ({
  logger,
  router,
  baseRoute,
  getActionsConfigurationUtilities,
}: {
  logger: Logger;
  router: IRouter;
  baseRoute: string;
  getActionsConfigurationUtilities: () => ActionsConfigurationUtilities;
}): void => {
  const path = `${baseRoute}/connector_types/_logo`;
  logger.debug(`registering triggers_actions_ui connector type logo route POST ${path}`);

  router.post(
    {
      path,
      security: { authz: { requiredPrivileges: [ReservedPrivilegesSet.superuser] } },
      options: { access: 'internal' },
      validate: {
        request: { body: connectorTypeLogoBodySchema },
      },
    },
    async (_context, request, response) => {
      try {
        const icon = await fetchConnectorTypeLogo({
          url: request.body.url,
          configurationUtilities: getActionsConfigurationUtilities(),
          logger,
        });
        return response.ok({ body: { icon } });
      } catch (error) {
        if (isGenerateConnectorTypeError(error)) {
          return response.customError({
            statusCode: error.statusCode,
            body: { message: error.message, attributes: { reason: error.reason } },
          });
        }
        throw error;
      }
    }
  );
};
