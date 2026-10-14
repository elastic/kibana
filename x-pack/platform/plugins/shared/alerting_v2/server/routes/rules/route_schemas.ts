/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { entityIdSchema, ENTITY_ID_NOTE } from '@kbn/alerting-v2-schemas';

/**
 * Shared path params schema for routes that accept a single rule ID.
 */
export const ruleIdParamsSchema = z
  .object({
    id: entityIdSchema.describe(`The identifier for the rule. ${ENTITY_ID_NOTE}`),
  })
  .strict();
