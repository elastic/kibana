/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const CasesStepCaseIdVersionSchema = z.object({
  case_id: z.string().min(1, 'case_id is required'),
  version: z.string().min(1).optional(),
});

export const CasesStepBaseConfigSchema = z
  .object({
    'push-case': z.boolean().optional().default(false),
  })
  // Needs to be a partial so it's not required in the YAML editor.
  // `.otional().default()` will still mark it as required.
  .partial();
