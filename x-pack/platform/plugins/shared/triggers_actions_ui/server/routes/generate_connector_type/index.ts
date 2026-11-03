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
import { CONNECTOR_BUILDER_INFERENCE_FEATURE_ID } from '../../../common/connector_type_generation';
import { fetchDocumentation } from './fetch_documentation';
import { generateConnectorTypeSpec } from './generate_connector_type_spec';
import { GenerateConnectorTypeError, isGenerateConnectorTypeError } from './types';

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
        const inference = await getInference();
        if (!inference) {
          throw new GenerateConnectorTypeError(
            'no_model',
            'No AI model is available. Set a default AI connector or pick a model for Connector builder in Feature Settings.',
            400
          );
        }

        const document = await fetchDocumentation({
          url: request.body.url,
          configurationUtilities: getActionsConfigurationUtilities(),
          logger,
        });
        const { signal, unsubscribe } = abortSignalFrom(request.events.aborted$);
        try {
          const connectorType = await generateConnectorTypeSpec({
            inferenceClient: inference.getClient({ request }),
            featureId: CONNECTOR_BUILDER_INFERENCE_FEATURE_ID,
            document,
            logger,
            abortSignal: signal,
          });
          return response.ok({ body: { connectorType } });
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
