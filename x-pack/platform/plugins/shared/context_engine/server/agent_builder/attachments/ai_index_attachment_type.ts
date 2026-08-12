/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { Capabilities } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { AI_INDEX_ATTACHMENT_TYPE } from '../../../common/agent_builder/constants';
import {
  MAX_AI_INDEX_AUTOMATION_LENGTH,
  MAX_AI_INDEX_AUTOMATIONS,
  MAX_AI_INDEX_DESCRIPTION_LENGTH,
  MAX_AI_INDEX_DEST_VALUE_LENGTH,
  MAX_AI_INDEX_FEEDBACK_AGENT_ID_LENGTH,
  MAX_AI_INDEX_ID_LENGTH,
  MAX_AI_INDEX_SOURCE_VALUE_LENGTH,
  MAX_AI_INDEX_SOURCES,
} from '../../../common/constants';
import type { AiIndexHttpItem } from '../../../common/http_api/ai_indices';
import type { WorkflowsManagementApiLike } from '../../types';
import { getAiIndexAutomationsTool } from '../tools/get_ai_index_automations';

const aiIndexAttachmentDataSchema = z.object({
  id: z.string().max(MAX_AI_INDEX_ID_LENGTH),
  description: z.string().max(MAX_AI_INDEX_DESCRIPTION_LENGTH).optional(),
  feedback_agent_id: z.string().max(MAX_AI_INDEX_FEEDBACK_AGENT_ID_LENGTH).optional(),
  managed: z.boolean(),
  dest: z.object({
    type: z.enum(['data_stream', 'index']),
    value: z.string().max(MAX_AI_INDEX_DEST_VALUE_LENGTH),
  }),
  automations: z
    .array(
      z.object({
        type: z.literal('workflow'),
        value: z.string().max(MAX_AI_INDEX_AUTOMATION_LENGTH),
      })
    )
    .max(MAX_AI_INDEX_AUTOMATIONS),
  sources: z
    .array(
      z.object({
        type: z.enum(['esql', 'connector']),
        value: z.string().max(MAX_AI_INDEX_SOURCE_VALUE_LENGTH),
      })
    )
    .max(MAX_AI_INDEX_SOURCES),
  date_created: z.string(),
  date_modified: z.string(),
});

/**
 * Server-side definition of the `ai_index` attachment: the payload is an `AiIndexHttpItem`. It is
 * neutral data-access plumbing — it grants ONLY the read-only `get_ai_index_automations` bounded
 * tool (via `getBoundedTools`) and grants NO registered tools (`getTools → []`), so attaching an AI
 * index to any agent — including a deliberately-restricted one — can never widen its tool surface.
 * ES|QL over the signals/traces indices comes from the running agent's own tool config, not here.
 */
export const createAiIndexAttachmentType = ({
  getWorkflowsApi,
  getCapabilities,
}: {
  getWorkflowsApi: () => WorkflowsManagementApiLike | undefined;
  getCapabilities: (request: KibanaRequest) => Promise<Capabilities>;
}): AttachmentTypeDefinition<typeof AI_INDEX_ATTACHMENT_TYPE, AiIndexHttpItem> => ({
  id: AI_INDEX_ATTACHMENT_TYPE,
  isReadonly: true,
  validate: (input) => {
    const parsed = aiIndexAttachmentDataSchema.safeParse(input);
    if (parsed.success) {
      return { valid: true, data: parsed.data as AiIndexHttpItem };
    }
    return { valid: false, error: parsed.error.message };
  },
  format: (attachment) => {
    const aiIndex = attachment.data;
    return {
      getRepresentation: () => ({
        type: 'text',
        value: [
          `AI index: ${aiIndex.id}${aiIndex.managed ? ' (managed)' : ''}`,
          aiIndex.description ? `Description: ${aiIndex.description}` : undefined,
          `Dest: ${aiIndex.dest.type} ${aiIndex.dest.value}`,
          `Sources: ${aiIndex.sources.length}`,
          `Automations: ${aiIndex.automations.length}`,
        ]
          .filter((line): line is string => Boolean(line))
          .join('\n'),
      }),
      getBoundedTools: () => [
        getAiIndexAutomationsTool({ aiIndex, getWorkflowsApi, getCapabilities }),
      ],
    };
  },
  getTools: () => [],
  getAgentDescription: () =>
    'An `ai_index` attachment carries one Context Engine AI index (its dest, sources, and linked ' +
    'automations). Use its bounded `get_ai_index_automations` tool to read the YAML of the ' +
    'workflows the index links as automations.',
});
