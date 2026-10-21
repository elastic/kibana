/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@elastic/isomer-sdk';

export const SavedObjectReferenceSchema = z.looseObject({
  id: z.string(),
  type: z.string(),
  name: z.string(),
});

export const SavedObjectEnvelopeSchema = z.looseObject({
  id: z.string(),
  type: z.string(),
  attributes: z.record(z.string(), z.unknown()),
  references: z.array(SavedObjectReferenceSchema).optional(),
  migrationVersion: z.record(z.string(), z.string()).optional(),
  coreMigrationVersion: z.string().optional(),
  updated_at: z.string().optional(),
});
