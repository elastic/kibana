/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isToolResultEvent, ToolResultType, type ToolResult } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { buildPath } from '@kbn/core-http-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import type { ApplicationStart } from '@kbn/core/public';
import {
  AI_INDEX_SUGGEST_AUTOMATION_CONTEXT_PATH,
  SUGGEST_AUTOMATION_CONTEXT_INTERNAL_API_VERSION,
} from '@kbn/context-engine-plugin/common/constants';
import type { SuggestAutomationContextResponse } from '@kbn/context-engine-plugin/common/http_api/automation_suggestion_context';
import type { SuggestAutomationProvider } from '@kbn/context-engine-plugin/public/types';
import { i18n } from '@kbn/i18n';
import { EMPTY, switchMap } from 'rxjs';
import { AI_INDEX_ATTACHMENT_TYPE } from '../common/agent_builder_attachments';
import {
  CONTEXT_ENGINE_INSTALL_AUTOMATION_TEMPLATE_TOOL_ID,
  CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID,
} from '../common/agent_builder_tools';
import type { AiIndexAttachmentData } from '../common/agent_builder_attachment_schemas';
import { CONTEXT_ENGINE_SETUP_AGENT_ID } from '../common/agent_builder_agents';

const AGENT_BUILDER_CAPABILITY = 'agentBuilder';
const CONTEXT_ENGINE_CAPABILITY = 'contextEngine';
const WORKFLOWS_MANAGEMENT_CAPABILITY = 'workflowsManagement';

const AUTOMATION_REFRESH_TOOL_IDS: ReadonlySet<string> = new Set([
  CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID,
  CONTEXT_ENGINE_INSTALL_AUTOMATION_TEMPLATE_TOOL_ID,
]);

/**
 * The user reads this message in the conversation, so it says what they asked for and nothing more.
 * Which skills to load and how to work are in the Context Engine agent's instructions; the
 * `ai_index` attachment carries the index itself.
 */
const SUGGEST_AUTOMATION_INITIAL_MESSAGE = i18n.translate(
  'xpack.contextEngine.aiIndexDetail.automations.suggestAutomationInitialMessage',
  { defaultMessage: 'Suggest an automation for this AI index.' }
);

const getAutomationToolAiIndexId = (result: ToolResult): string | undefined => {
  if (result.type !== ToolResultType.other) {
    return undefined;
  }

  if (!('aiIndexId' in result.data) || typeof result.data.aiIndexId !== 'string') {
    return undefined;
  }

  return result.data.aiIndexId;
};

export const buildSuggestAutomationSessionTag = (spaceId: string, aiIndexId: string): string =>
  `context-engine-ai-index:${spaceId}:${aiIndexId}`;

/**
 * Explores the index the way a reviewer setting it up would — field summaries and a document
 * sample per source, each existing automation's definition, how many signals and trace rows
 * already exist — so the attachment hands the agent conclusions instead of a reason to look.
 * Failure here is not fatal: the chat still opens with the plain index snapshot, just without the
 * shortcut, and the agent falls back to exploring the sources itself.
 */
const fetchSuggestionContext = async (
  http: HttpStart,
  aiIndexId: string
): Promise<SuggestAutomationContextResponse | undefined> => {
  try {
    return await http.get<SuggestAutomationContextResponse>(
      buildPath(AI_INDEX_SUGGEST_AUTOMATION_CONTEXT_PATH, { aiIndexId }),
      { version: SUGGEST_AUTOMATION_CONTEXT_INTERNAL_API_VERSION }
    );
  } catch {
    return undefined;
  }
};

export const createSuggestAutomationProvider = ({
  agentBuilder,
  application,
  http,
}: {
  agentBuilder: AgentBuilderPluginStart | undefined;
  application: ApplicationStart;
  http: HttpStart;
}): SuggestAutomationProvider => ({
  canSuggest: ({ aiIndex, isManaged }) =>
    aiIndex !== undefined &&
    !isManaged &&
    application.capabilities[AGENT_BUILDER_CAPABILITY]?.show === true &&
    application.capabilities[CONTEXT_ENGINE_CAPABILITY]?.write === true &&
    application.capabilities[WORKFLOWS_MANAGEMENT_CAPABILITY]?.readWorkflow === true &&
    application.capabilities[WORKFLOWS_MANAGEMENT_CAPABILITY]?.createWorkflow === true &&
    application.capabilities[WORKFLOWS_MANAGEMENT_CAPABILITY]?.executeWorkflow === true &&
    agentBuilder?.openChat !== undefined,

  suggestAutomation: async ({ aiIndex, spaceId }) => {
    if (!agentBuilder?.openChat) {
      return;
    }
    const context = await fetchSuggestionContext(http, aiIndex.id);
    const attachmentData: AiIndexAttachmentData = {
      id: aiIndex.id,
      description: aiIndex.description,
      dest: aiIndex.dest,
      sources: context?.sources ?? aiIndex.sources,
      automations: context?.automations ?? aiIndex.automations,
      traces: context?.traces ?? aiIndex.traces,
      ...(context ? { signals_summary: context.signals_summary } : {}),
    };
    agentBuilder.openChat({
      autoSendInitialMessage: true,
      initialMessage: SUGGEST_AUTOMATION_INITIAL_MESSAGE,
      sessionTag: buildSuggestAutomationSessionTag(spaceId, aiIndex.id),
      agentId: CONTEXT_ENGINE_SETUP_AGENT_ID,
      attachments: [
        {
          id: aiIndex.id,
          type: AI_INDEX_ATTACHMENT_TYPE,
          description: i18n.translate(
            'xpack.contextEngine.aiIndexDetail.automations.suggestAttachmentLabel',
            {
              defaultMessage: 'AI index {name}',
              values: { name: aiIndex.id },
            }
          ),
          data: attachmentData,
        },
      ],
    });
  },

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

        if (!successfulResults.some((result) => getAutomationToolAiIndexId(result) === aiIndexId)) {
          return;
        }

        onSaved();
      });

    return () => subscription.unsubscribe();
  },
});
