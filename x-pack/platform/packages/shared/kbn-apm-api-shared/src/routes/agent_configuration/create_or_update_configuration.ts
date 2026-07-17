/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { BooleanFromString } from '@kbn/zod-helpers/v4';
import { agentConfigurationIntakeSchema } from '@kbn/apm-common';
import { defineRoute } from '../types';

export const createOrUpdateAgentConfigurationRoute = defineRoute<void>()({
  endpoint: 'PUT /api/apm/settings/agent-configuration 2023-10-31',
  params: z.object({
    query: z.object({ overwrite: BooleanFromString.optional() }).optional(),
    body: agentConfigurationIntakeSchema,
  }),
});
