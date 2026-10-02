/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { entityIdSchema, ENTITY_ID_NOTE } from '@kbn/alerting-v2-schemas';

/**
 * Builds the path params schema for routes that accept a single action policy ID.
 */

export const actionPolicyIdParamsSchema = z
  .object({
    id: entityIdSchema.describe(
      `The ID of the action policy. Copy it from the response when you create a policy, fetch one policy, or fetch the policy list. ${ENTITY_ID_NOTE}`
    ),
  })
  .strict();
