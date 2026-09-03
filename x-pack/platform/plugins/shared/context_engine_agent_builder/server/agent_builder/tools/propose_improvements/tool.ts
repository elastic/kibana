/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { CoreStart, ElasticsearchClient } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { z } from '@kbn/zod/v4';
import dedent from 'dedent';
import {
  MAX_AI_INDEX_ID_LENGTH,
  MAX_IMPROVEMENTS_PER_RUN,
} from '@kbn/context-engine-plugin/common/constants';
import { conversationProposalSchema } from '@kbn/context-engine-plugin/common/http_api/improvements_output_schema';
import { validateAiIndexId } from '@kbn/context-engine-plugin/common/validation';
import type { AiIndexService } from '@kbn/context-engine-plugin/server/ai_indices/service';
import type { ImprovementsServiceApi } from '@kbn/context-engine-plugin/server/improvements/service';
import { CONTEXT_ENGINE_PROPOSE_IMPROVEMENTS_TOOL_ID } from '../../../../common/agent_builder_tools';
import { proposeImprovementsHandler } from './handler';

const proposeImprovementsSchema = z
  .object({
    aiIndexId: z
      .string()
      .max(MAX_AI_INDEX_ID_LENGTH)
      .optional()
      .describe(
        'Context Engine AI index id. Defaults to the id from the ai_index attachment in this conversation.'
      ),
    improvements: z
      .array(conversationProposalSchema)
      .min(1)
      .max(MAX_IMPROVEMENTS_PER_RUN)
      .describe('The changes to propose. Each is reviewed and applied separately.'),
  })
  .superRefine((value, ctx) => {
    if (value.aiIndexId === undefined) {
      return;
    }

    const validationError = validateAiIndexId(value.aiIndexId);
    if (validationError) {
      ctx.addIssue({ code: 'custom', message: validationError, path: ['aiIndexId'] });
    }
  });

export const createProposeImprovementsTool = ({
  getAiIndexService,
  getImprovementsService,
  getCoreStart,
  getSecurityStart,
}: {
  getAiIndexService: () => Promise<AiIndexService>;
  getImprovementsService: (esClient: ElasticsearchClient) => Promise<ImprovementsServiceApi>;
  getCoreStart: () => Promise<CoreStart>;
  getSecurityStart: () => Promise<SecurityPluginStart | undefined>;
}): BuiltinToolDefinition<typeof proposeImprovementsSchema> => ({
  id: CONTEXT_ENGINE_PROPOSE_IMPROVEMENTS_TOOL_ID,
  type: ToolType.builtin,
  tags: ['context_engine'],
  // Writes a suggestion, not the change it suggests. Nothing it records takes effect until a
  // person approves it, which is why it needs no confirmation of its own.
  annotations: {
    title: 'Propose Context Engine improvements',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  description: dedent`
    Propose changes to a Context Engine AI index for a person to review.

    Records suggestions in the same review queue the scheduled analysis writes to: they appear on
    the AI index page, and nothing takes effect until someone approves them there. Use this rather
    than applying a change directly whenever the change is a judgement call — what the index should
    cover, which source it should draw on, or what an automation should do — so the reasoning is
    recorded and a reviewer can turn it down.

    Each proposal names an action and carries the body that action needs:
    - add_ki / edit_ki / remove_ki — a Knowledge Indicator. \`payload.ki\` to add,
      \`payload.ki_patch\` plus \`target.ki_id\` to edit or remove.
    - add_workflow / edit_workflow / remove_workflow — an automation. \`payload.workflow_yaml\`,
      plus \`target.workflow_id\` when changing an existing one. Validate the YAML before proposing.
    - add_source / edit_source / remove_source — a source. \`payload.source\`, plus
      \`target.source_value\` when changing an existing one.

    An \`add_*\` action has no existing thing to point at, so give \`target.subject\`: what the
    addition is about. Without it two unrelated additions can collapse into one suggestion.

    Proposals outside the index's allowed actions come back in \`skipped\` with a reason rather than
    failing the call. Read the result and tell the user what was and was not recorded.
  `,
  schema: proposeImprovementsSchema,
  handler: async (params, { request, spaceId, attachments, callContext, esClient, logger }) => {
    try {
      const result = await proposeImprovementsHandler({
        params,
        request,
        spaceId,
        attachments,
        toolCallId: callContext.toolCallId,
        esClient: esClient.asCurrentUser,
        logger,
        getAiIndexService,
        getImprovementsService,
        getCoreStart,
        getSecurityStart,
      });

      return { results: [{ type: ToolResultType.other, data: result }] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Error running ${CONTEXT_ENGINE_PROPOSE_IMPROVEMENTS_TOOL_ID}: ${message}`, {
        error,
      });

      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Failed to propose improvements: ${message}` },
          },
        ],
      };
    }
  },
});
