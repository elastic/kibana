/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { SUB_ACTION } from './constants';

export const ConfigSchema = z.object({
  url: z.string(),
});

export const SecretsSchema = z.object({
  apiKey: z.string(),
  apiKeyID: z.string().nullable(),
});

export const XSOARPlaybooksActionParamsSchema = null;
export const XSOARPlaybooksObjectSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export const XSOARPlaybooksActionResponseSchema = z.object({
  playbooks: z.array(XSOARPlaybooksObjectSchema),
});

export const XSOARRunActionParamsSchema = z.object({
  name: z.string(),
  playbookId: z.string().nullable(),
  createInvestigation: z.boolean(),
  severity: z.number(),
  isRuleSeverity: z.boolean().default(false).nullable(),
  body: z.string().nullable(),
});
export const XSOARRunActionResponseSchema = z.object({});

export const ExecutorParamsSchema = z.union([
  z.object({
    subAction: z.literal(SUB_ACTION.PLAYBOOKS),
    subActionParams: z.literal(null), // this subaction not required any value as params
  }),
  z.object({
    subAction: z.literal(SUB_ACTION.RUN),
    subActionParams: XSOARRunActionParamsSchema,
  }),
]);
