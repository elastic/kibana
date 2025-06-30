/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SUB_ACTION } from './constants';

export const ConfigSchema = schema.object({
  url: schema.string(),
});

export const SecretsSchema = schema.object({
  apiKey: schema.string(),
  apiKeyID: schema.nullable(schema.string()),
});

export const XSOARPlaybooksActionParamsSchema = null;
export const XSOARPlaybooksObjectSchema = schema.object(
  {
    id: schema.string(),
    name: schema.string(),
  },
  { unknowns: 'ignore' }
);
export const XSOARPlaybooksActionResponseSchema = schema.object(
  {
    playbooks: schema.arrayOf(XSOARPlaybooksObjectSchema),
  },
  { unknowns: 'ignore' }
);

export const XSOARRunActionParamsSchema = schema.object({
  name: schema.string(),
  playbookId: schema.nullable(schema.string()),
  createInvestigation: schema.boolean(),
  severity: schema.number(),
  isRuleSeverity: schema.nullable(schema.boolean({ defaultValue: false })),
  body: schema.nullable(schema.string()),
});
export const XSOARRunActionResponseSchema = schema.object({}, { unknowns: 'ignore' });

export const ExecutorParamsSchema = schema.oneOf([
  schema.object({
    subAction: schema.literal(SUB_ACTION.PLAYBOOKS),
    subActionParams: schema.literal(null), // this subaction not required any value as params
  }),
  schema.object({
    subAction: schema.literal(SUB_ACTION.RUN),
    subActionParams: XSOARRunActionParamsSchema,
  }),
]);
