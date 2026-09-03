/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isToolResultEvent, ToolResultType, type ToolResult } from '@kbn/agent-builder-common';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { ApplicationStart } from '@kbn/core/public';
import type { GetAiIndexResponse } from '@kbn/context-engine-plugin/common/http_api/ai_indices';
import type { SuggestAutomationProvider } from '@kbn/context-engine-plugin/public/types';
import { i18n } from '@kbn/i18n';
import { EMPTY, switchMap } from 'rxjs';
import { AI_INDEX_ATTACHMENT_TYPE } from '../common/agent_builder_attachments';
import {
  AI_INDEX_AUTOMATIONS_SKILL_ID,
  AI_INDEX_SOURCES_SKILL_ID,
  ANALYZE_AND_IMPROVE_SKILL_ID,
} from '../common/agent_builder_skills';
import { CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID } from '../common/agent_builder_tools';

const AGENT_BUILDER_CAPABILITY = 'agentBuilder';

const AUTOMATION_REFRESH_TOOL_IDS: ReadonlySet<string> = new Set([
  CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID,
]);

// Both entry points exist to produce an automation, so they ask for the authoring skill up front
// rather than leaving the agent to notice partway through that it cannot write one.
const SUGGEST_AUTOMATION_INITIAL_MESSAGE = i18n.translate(
  'xpack.contextEngine.aiIndexDetail.automations.suggestAutomationInitialMessage',
  {
    defaultMessage:
      "Load [/{analysisSkillId}](skill://{analysisSkillId}) and [/{automationsSkillId}](skill://{automationsSkillId}), then suggest an automation for the attached AI index. Skip discovery and only use the attachment's destination, sources, and automations.",
    values: {
      analysisSkillId: ANALYZE_AND_IMPROVE_SKILL_ID,
      automationsSkillId: AI_INDEX_AUTOMATIONS_SKILL_ID,
    },
  }
);

const GUIDED_SETUP_INITIAL_MESSAGE = i18n.translate(
  'xpack.contextEngine.aiIndexDetail.sources.guidedSetupInitialMessage',
  {
    defaultMessage:
      'Load [/{analysisSkillId}](skill://{analysisSkillId}), [/{sourcesSkillId}](skill://{sourcesSkillId}) and [/{automationsSkillId}](skill://{automationsSkillId}), then help me set up the attached AI index. It has no sources yet — ask me what I want agents to answer, then work out which of my indices or connectors to draw on and what automations should fill it.',
    values: {
      analysisSkillId: ANALYZE_AND_IMPROVE_SKILL_ID,
      sourcesSkillId: AI_INDEX_SOURCES_SKILL_ID,
      automationsSkillId: AI_INDEX_AUTOMATIONS_SKILL_ID,
    },
  }
);

/**
 * Attachment id is the AI index id so repeated pushes replace rather than stack, and so the
 * ambient page attachment and the one an explicit button opens with are the same attachment.
 */
export const toAiIndexAttachment = (aiIndex: GetAiIndexResponse): AttachmentInput => ({
  id: aiIndex.id,
  type: AI_INDEX_ATTACHMENT_TYPE,
  description:
    aiIndex.description ??
    i18n.translate('xpack.contextEngine.aiIndexDetail.automations.suggestAttachmentLabel', {
      defaultMessage: 'AI index {name}',
      values: { name: aiIndex.id },
    }),
  data: {
    id: aiIndex.id,
    description: aiIndex.description,
    dest: aiIndex.dest,
    sources: aiIndex.sources,
    automations: aiIndex.automations,
  },
});

const getAutomationToolAiIndexId = (result: ToolResult): string | undefined => {
  if (result.type !== ToolResultType.other) {
    return undefined;
  }

  if (!('aiIndexId' in result.data) || typeof result.data.aiIndexId !== 'string') {
    return undefined;
  }

  return result.data.aiIndexId;
};

/**
 * Keys the conversation Agent Builder restores when the sidebar reopens. One per AI index, so work
 * on one index does not resume into a thread about another.
 */
const aiIndexSessionTag = (aiIndexId: string) => `context-engine-ai-index-${aiIndexId}`;

export const createSuggestAutomationProvider = ({
  agentBuilder,
  application,
}: {
  agentBuilder: AgentBuilderPluginStart | undefined;
  application: ApplicationStart;
}): SuggestAutomationProvider => {
  const openWith = (aiIndex: GetAiIndexResponse, initialMessage: string): void => {
    if (!agentBuilder?.openChat) {
      return;
    }

    // No `newConversation`, so the session tag resumes the thread already going about this index
    // rather than starting a fresh one each time the button is pressed. Setting up an index and
    // then automating it is one piece of work, and the agent keeps what it learned in between.
    // `initialMessage` only applies to the first visit, which is when the skills need loading.
    agentBuilder.openChat({
      autoSendInitialMessage: false,
      initialMessage,
      sessionTag: aiIndexSessionTag(aiIndex.id),
      // Re-sent on every open so a resumed conversation sees the index as it is now, not as it was
      // when the thread started. Attachments are consumed by the next message, not accumulated.
      attachments: [toAiIndexAttachment(aiIndex)],
    });
  };

  return {
    canSuggest: ({ aiIndex, isManaged }) =>
      aiIndex !== undefined &&
      !isManaged &&
      application.capabilities[AGENT_BUILDER_CAPABILITY]?.show === true &&
      agentBuilder?.openChat !== undefined,

    suggestAutomation: ({ aiIndex }) => openWith(aiIndex, SUGGEST_AUTOMATION_INITIAL_MESSAGE),

    startGuidedSetup: ({ aiIndex }) => openWith(aiIndex, GUIDED_SETUP_INITIAL_MESSAGE),

    subscribeToAutomationSaved: (aiIndexId, onSaved) => {
      if (!agentBuilder?.events) {
        return () => {};
      }

      const subscription = agentBuilder.events.ui.activeConversation$
        .pipe(
          switchMap((conversation) =>
            conversation?.id ? agentBuilder.events.getChatEvents$(conversation.id) : EMPTY
          )
        )
        .subscribe((event) => {
          if (!isToolResultEvent(event)) {
            return;
          }

          if (!AUTOMATION_REFRESH_TOOL_IDS.has(event.data.tool_id)) {
            return;
          }

          const successfulResults = event.data.results.filter(
            (result) => result.type !== ToolResultType.error
          );
          if (successfulResults.length === 0) {
            return;
          }

          if (
            !successfulResults.some((result) => getAutomationToolAiIndexId(result) === aiIndexId)
          ) {
            return;
          }

          onSaved();
        });

      return () => subscription.unsubscribe();
    },
  };
};
