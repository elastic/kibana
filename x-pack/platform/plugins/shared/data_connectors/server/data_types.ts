/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

/**
 * Type for Stack connector secrets.
 */
export type ConnectorSecrets = z.infer<typeof ConnectorSecretsSchema>;

/**
 * Schema for Stack connector secrets.
 */
export const ConnectorSecretsSchema = z.object({
  token: z.string().optional(),
  apiKey: z.string().optional(),
  user: z.string().optional(),
  password: z.string().optional(),
  secretHeaders: z.record(z.string(), z.string()).optional(),
});
