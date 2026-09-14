/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformSignificantEventsTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import {
  INVESTIGATION_PROGRESS_UI_EVENT,
  investigationStateSchema,
} from '@kbn/significant-events-schema';
import { INVESTIGATION_ATTACHMENT_IDS } from '@kbn/agentic-investigations-plugin/common';
import type { InvestigationsService } from '@kbn/agentic-investigations-plugin/server';
import dedent from 'dedent';

export const UPDATE_INVESTIGATION_TOOL_ID = platformSignificantEventsTools.updateInvestigation;

const toolDescription = dedent`
  ${i18n.translate(
    'xpack.nightshiftInvestigations.agentBuilder.tools.updateInvestigation.description',
    {
      defaultMessage:
        'Update the investigation state: persist impact entities, hypotheses, recommendations, and blind spots directly as conversation attachments. Also emits a live UI event so the user sees progress in real time. Call this after every meaningful change — a new hypothesis, a confidence update, a confirmed root cause — and always include the full current state (not just the delta).',
    }
  )}
`;

type InvestigationState = ReturnType<typeof investigationStateSchema.parse>;

const getAttachmentData = (
  type: string,
  state: InvestigationState
): Record<string, unknown> | undefined => {
  switch (type) {
    case INVESTIGATION_ATTACHMENT_IDS.IMPACT:
      return state.impact ? { entities: state.impact.entities } : undefined;
    case INVESTIGATION_ATTACHMENT_IDS.HYPOTHESES:
      return { hypotheses: state.hypotheses };
    case INVESTIGATION_ATTACHMENT_IDS.RECOMMENDATIONS:
      return { recommendations: state.recommendations ?? [] };
    case INVESTIGATION_ATTACHMENT_IDS.BLIND_SPOTS:
      return { blind_spots: state.blind_spots ?? [] };
    default:
      return undefined;
  }
};

const ATTACHMENT_TYPES = [
  INVESTIGATION_ATTACHMENT_IDS.IMPACT,
  INVESTIGATION_ATTACHMENT_IDS.HYPOTHESES,
  INVESTIGATION_ATTACHMENT_IDS.RECOMMENDATIONS,
  INVESTIGATION_ATTACHMENT_IDS.BLIND_SPOTS,
] as const;

export const createUpdateInvestigationTool = ({
  getInvestigationsService,
  logger,
}: {
  getInvestigationsService: () => InvestigationsService | undefined;
  logger: Logger;
}): BuiltinToolDefinition<typeof investigationStateSchema> => ({
  id: UPDATE_INVESTIGATION_TOOL_ID,
  type: ToolType.builtin,
  description: toolDescription,
  annotations: {
    title: 'Update Investigation',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  schema: investigationStateSchema,
  tags: ['streams', 'investigation'],
  excludeFromMcp: true,
  handler: async (state, context) => {
    // Emit live UI event so the frontend can render progress immediately
    context.events.sendUiEvent(INVESTIGATION_PROGRESS_UI_EVENT, state);

    const { spaceId, attachments: attachmentManager } = context;
    const agentEntry = context.runContext.stack.find((e) => e.type === 'agent');
    const conversationId = agentEntry?.type === 'agent' ? agentEntry.conversationId : undefined;

    // Upsert each of the four investigation attachment types directly with data
    const activeAttachments = attachmentManager.getActive();
    for (const attachmentType of ATTACHMENT_TYPES) {
      const data = getAttachmentData(attachmentType, state);
      if (data === undefined) continue;

      const existing = activeAttachments.find((a) => a.type === attachmentType);
      try {
        if (existing) {
          await attachmentManager.update(existing.id, { data });
        } else {
          await attachmentManager.add({ type: attachmentType, data });
        }
      } catch (err) {
        logger.warn(
          `Failed to upsert attachment "${attachmentType}" for conversation "${conversationId}": ${err.message}`
        );
      }
    }

    // Persist the full state to the investigation SO so the listing page and
    // search/filter remain current throughout the investigation.
    // The SO is keyed by the workflow execution ID (= investigation ID), not the conversation ID.
    // parentExecutionId is the workflow execution ID when the agent is spawned by a workflow step.
    const investigationId = context.parentExecutionId ?? conversationId;
    if (investigationId) {
      const investigationsService = getInvestigationsService();
      if (investigationsService) {
        try {
          const existing = await investigationsService.get(spaceId, investigationId);
          if (existing) {
            await investigationsService.upsert(spaceId, {
              ...existing,
              summary: state.summary,
              severity: state.severity,
              hypotheses: state.hypotheses as Array<Record<string, unknown>>,
              recommendations: (state.recommendations ?? []) as Array<Record<string, unknown>>,
              blindSpots: (state.blind_spots ?? []) as Array<Record<string, unknown>>,
              impact: state.impact
                ? { entities: state.impact.entities as Array<Record<string, unknown>> }
                : existing.impact,
            });
          }
        } catch (err) {
          logger.warn(
            `Failed to update investigation SO for id "${investigationId}": ${err.message}`
          );
        }
      }
    }

    logger.debug(`Updated investigation state for conversation "${conversationId}"`);

    return {
      results: [
        {
          type: ToolResultType.other,
          data: { acknowledged: true },
        },
      ],
    };
  },
});
