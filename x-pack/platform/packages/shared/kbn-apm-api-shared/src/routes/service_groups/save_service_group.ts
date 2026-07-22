/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { SavedServiceGroup } from '@kbn/apm-types';
import { defineRoute } from '../types';

export type SaveServiceGroupResponse = SavedServiceGroup;

export const serviceGroupSaveRoute = defineRoute<SaveServiceGroupResponse>()({
  endpoint: 'POST /internal/apm/service-group',
  params: z.object({
    query: z.object({ serviceGroupId: z.string().optional() }).optional(),
    body: z.object({
      groupName: z.string(),
      kuery: z.string(),
      description: z.string().optional(),
      color: z.string().optional(),
    }),
  }),
});
