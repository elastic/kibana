/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { type RequestHandler, SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';

// import type { Script } from '@elastic/elasticsearch/lib/api/types';
import { FleetRequestHandler } from '../../types';
import { CustomIntegrationRequestSchema } from '../../types/models/custom_integrations';
import { updateCustomIntegration } from '../../services/custom_integrations/update_custom_integration';
export const updateCustomIntegrationHandler: FleetRequestHandler<
  TypeOf<typeof CustomIntegrationRequestSchema.body>
> = async (context, request, response) => {
  const [coreContext] = await Promise.all([context.core, context.fleet]);
  const esClient = coreContext.elasticsearch.client.asInternalUser;

  try {
    //  TODO: based on the passed in fields here, we need to update them accordingly. As of now, we are only taking readMeData and categories, so we will update them using esclient
    const { id, fields } = request.body; // placeholder
    const { readMeData, categories } = fields[0]; // another placeholder for not

    // call the service here to do the actual logic
    const res = await updateCustomIntegration(esClient, id, fields);
    return response.ok({ body: res });
  } catch (error) {
    if (error.isBoom) {
      return response.customError({
        statusCode: error.output.statusCode,
        body: { message: `Failed to update custom integration` },
      });
    }

    throw error;
  }
};
