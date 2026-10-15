/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { agentIdMaxLength } from '@kbn/agent-builder-common';

const ID_MAX_LENGTH = 256;

/**
 * The automation behind a timeline event, when it was not a direct user action: the workflow or
 * agent run that wrote the metadata. Mirrors Agent Builder's `MetadataPatchContext`.
 */
export const eventViaSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('workflow'),
    workflow_id: z.string().min(1).max(ID_MAX_LENGTH),
    workflow_name: z.string().max(1024).optional(),
    execution_id: z.string().min(1).max(ID_MAX_LENGTH),
  }),
  z.object({
    type: z.literal('agent'),
    agent_id: z.string().min(1).max(agentIdMaxLength),
    agent_name: z.string().max(1024).optional(),
    execution_id: z.string().min(1).max(ID_MAX_LENGTH).optional(),
  }),
]);

export type EventVia = z.infer<typeof eventViaSchema>;
