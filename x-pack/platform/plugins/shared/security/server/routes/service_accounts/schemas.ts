/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

import { serviceAccountNameSchema } from '../../../common/service_accounts';

export const createServiceAccountBodySchema = z
  .object({
    name: serviceAccountNameSchema.min(1),
  })
  // Rejects unknown keys, so callers cannot supply `assumable_by` or `role_assignments` — Kibana
  // derives both itself.
  .strict();
