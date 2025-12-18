/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';

import type { FleetRequestHandler, PostGenerateAgentsReportRequestSchema } from '../../types';

export const generateReportHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostGenerateAgentsReportRequestSchema.body>
> = async (context, request, response) => {
  // const coreContext = await context.core;
  // const esClient = coreContext.elasticsearch.client.asInternalUser;

  return response.ok({ body: { url: 'https://elastic.co' } });
};
