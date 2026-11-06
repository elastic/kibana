/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import { ReservedPrivilegesSet } from '@kbn/core/server';
import type { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { lazySchema, z } from '@kbn/zod/v4';
import { generateFromDocumentation } from './generate_from_documentation';
import { isGenerateConnectorTypeError } from './types';

const generateConnectorTypeBodySchema = lazySchema(() =>
  z
    .object({
      url: z.string().url().max(2048),
    })
    .strict()
);

const abortSignalFrom = (aborted$: {
  subscribe: (handler: () => void) => { unsubscribe: () => void };
}) => {
  const controller = new AbortController();
  const subscription = aborted$.subscribe(() => {
    controller.abort();
  });
  return { signal: controller.signal, unsubscribe: () => subscription.unsubscribe() };
};

/** Registers the internal route that drafts a connector type from a documentation URL. */
export const createGenerateConnectorTypeRoute = ({
  logger,
  router,
  baseRoute,
  getActionsConfigurationUtilities,
  getInference,
}: {
  logger: Logger;
  router: IRouter;
  baseRoute: string;
  getActionsConfigurationUtilities: () => ActionsConfigurationUtilities;
  getInference: () => Promise<InferenceServerStart | undefined>;
}): void => {
  const path = `${baseRoute}/connector_types/_generate`;
  logger.debug(`registering triggers_actions_ui generate connector type route POST ${path}`);

  router.post(
    {
      path,
      security: { authz: { requiredPrivileges: [ReservedPrivilegesSet.superuser] } },
      options: { access: 'internal' },
      validate: {
        request: { body: generateConnectorTypeBodySchema },
      },
    },
    async (_context, request, response) => {
      try {
        const { signal, unsubscribe } = abortSignalFrom(request.events.aborted$);
        try {
          const { connectorType, logoUrl, documentUrl } = await generateFromDocumentation({
            url: request.body.url,
            request,
            getInference,
            getActionsConfigurationUtilities,
            logger,
            abortSignal: signal,
          });
          return response.ok({ body: { connectorType, logoUrl, documentUrl } });
        } finally {
          unsubscribe();
        }
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
