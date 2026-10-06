/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createErrorResult, createOtherResult } from '@kbn/agent-builder-server';
import type { InvestigationEvidence } from '../../../common/evidence/evidence';
import { GET_INVESTIGATION_TOOL_ID } from '../../../common/investigations/constants';
import type { Investigation } from '../../../common/investigations/investigation';
import { formatEvidenceForAgent, getToolConversationId } from '../../investigation_attachments';
import type { InvestigationsPrivilegesChecker } from '../services/check_investigations_privileges';
import type { InvestigationsQueryService } from '../services/investigations_query_service';

const MAX_ID_LENGTH = 256;

export const getInvestigationToolSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(MAX_ID_LENGTH)
    .optional()
    .describe('The investigation (conversation) id. Defaults to the current conversation.'),
});

const DESCRIPTION = `Reads an investigation: its title, metadata (status, severity, summary, verdict), whether it is in progress, its subjects, impact, hypotheses, and proposed actions. Without "id" it reads the investigation this conversation is. Evidence charts are summarized, not returned as raw points.`;

/** The investigation as the agent reads it: evidence as compact text instead of chart points. */
const toAgentView = (investigation: Investigation) => {
  const evidence = (value: InvestigationEvidence | undefined): string | undefined =>
    value ? formatEvidenceForAgent(value) : undefined;
  const { impact, hypotheses } = investigation;
  return {
    ...investigation,
    ...(impact && {
      impact: {
        ...impact,
        evidence: evidence(impact.evidence),
        entities: impact.entities.map((entity) => ({
          ...entity,
          evidence: evidence(entity.evidence),
        })),
      },
    }),
    ...(hypotheses && {
      hypotheses: {
        ...hypotheses,
        hypotheses: hypotheses.hypotheses.map((hypothesis) => ({
          ...hypothesis,
          evidence: hypothesis.evidence?.map(formatEvidenceForAgent),
        })),
      },
    }),
  };
};

/** `agentic_investigations.get`: the agent's (and skills') read path for an investigation. */
export const createGetInvestigationTool = ({
  getQueryService,
  privileges,
  logger,
}: {
  getQueryService: () => InvestigationsQueryService;
  privileges: InvestigationsPrivilegesChecker;
  logger: Logger;
}): BuiltinToolDefinition<typeof getInvestigationToolSchema> => ({
  id: GET_INVESTIGATION_TOOL_ID,
  type: ToolType.builtin,
  description: DESCRIPTION,
  schema: getInvestigationToolSchema,
  annotations: {
    title: 'Get Investigation',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  tags: ['investigation'],
  excludeFromMcp: true,
  availability: {
    // Per principal, so it cannot be cached per space.
    cacheMode: 'none',
    handler: async ({ request }) => {
      try {
        await privileges.assertCanRead(request);
        return { status: 'available' };
      } catch (error) {
        return { status: 'unavailable', reason: errorMessage(error) };
      }
    },
  },
  handler: async ({ id }, context) => {
    const investigationId = id ?? getToolConversationId(context);
    if (!investigationId) {
      return {
        results: [
          createErrorResult(
            `${GET_INVESTIGATION_TOOL_ID} needs an "id" when it runs outside a conversation.`
          ),
        ],
      };
    }

    try {
      await privileges.assertCanRead(context.request);
      const investigation = await getQueryService().get(context.request, investigationId);
      return { results: [createOtherResult(toAgentView(investigation))] };
    } catch (error) {
      logger.debug(
        `Tool ${GET_INVESTIGATION_TOOL_ID} failed for ${investigationId}: ${errorMessage(error)}`
      );
      return { results: [createErrorResult(errorMessage(error))] };
    }
  },
});

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
