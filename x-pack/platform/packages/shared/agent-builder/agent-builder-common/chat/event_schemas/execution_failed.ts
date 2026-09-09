/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { AgentBuilderErrorCode } from '../../base/errors';

export const executionFailedEventDataSchema = z.object({
  error: z.object({
    code: z.enum(AgentBuilderErrorCode),
    message: z.string(),
    meta: z.record(z.string(), z.unknown()).optional(),
  }),
});
