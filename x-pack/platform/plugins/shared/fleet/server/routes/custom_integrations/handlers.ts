/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { type RequestHandler, SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';

// import type { Script } from '@elastic/elasticsearch/lib/api/types';
import type { FleetRequestHandler } from '../../types';
import type { CustomIntegrationRequestSchema } from '../../types/models/custom_integrations';
import { updateCustomIntegration } from '../../services/custom_integrations/update_custom_integration';
export const updateCustomIntegrationHandler: FleetRequestHandler<
  TypeOf<typeof CustomIntegrationRequestSchema.body>
> = async (context, request, response) => {
  const [coreContext] = await Promise.all([context.core, context.fleet]);
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const soClient = coreContext.savedObjects.client;

  // call the service here to do the actual logic
  try {
    const { id, fields } = request.body as TypeOf<typeof CustomIntegrationRequestSchema.body>;

    const result = await updateCustomIntegration(esClient, soClient, id, fields);

    return response.ok({
      body: {
        id,
        ...result,
      },
    });
  } catch (error) {
    return response.customError({
      statusCode: 500,
      body: {
        message: `Failed to update integration: ${error.message}`,
      },
    });
  }
};
