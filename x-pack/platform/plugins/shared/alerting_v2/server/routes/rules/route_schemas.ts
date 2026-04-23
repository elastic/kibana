/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * Shared path params schema for routes that accept a single rule ID.
 */
export const ruleIdParamsSchema = z.object({
  id: z.string().describe('The identifier for the rule.'),
});
