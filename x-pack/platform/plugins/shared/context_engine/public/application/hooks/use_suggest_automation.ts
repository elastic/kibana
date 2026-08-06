/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isToolResultEvent, ToolResultType, type ToolResult } from '@kbn/agent-builder-common';
import { i18n } from '@kbn/i18n';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { EMPTY, switchMap } from 'rxjs';
import { AI_INDEX_ATTACHMENT_TYPE } from '../../../common/agent_builder_attachments';
import { CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID } from '../../../common/agent_builder_tools';
import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import { useKibana } from './use_kibana';

const AGENT_BUILDER_CAPABILITY = 'agentBuilder';

const AUTOMATION_REFRESH_TOOL_IDS: ReadonlySet<string> = new Set([
  CONTEXT_ENGINE_SAVE_AUTOMATION_TOOL_ID,
]);

const SUGGEST_AUTOMATION_INITIAL_MESSAGE = i18n.translate(
  'xpack.contextEngine.aiIndexDetail.automations.suggestAutomationInitialMessage',
  {
    defaultMessage:
      'Use the ki-automation-generation skill for this AI index. Sample the configured sources, suggest a Knowledge Indicator extraction strategy, draft a workflow automation, and test it with a small pilot run.',
  }
);

interface UseSuggestAutomationParams {
  aiIndex: GetAiIndexResponse | undefined;
  isManaged: boolean;
  onSaved: () => void;
}

const getAutomationToolAiIndexId = (result: ToolResult): string | undefined => {
  if (result.type !== ToolResultType.other) {
    return undefined;
  }

  if (!('aiIndexId' in result.data) || typeof result.data.aiIndexId !== 'string') {
    return undefined;
  }

  return result.data.aiIndexId;
};

interface UseSuggestAutomationResult {
  canSuggest: boolean;
  suggestAutomation: () => void;
}

export type { UseSuggestAutomationResult };

export const useSuggestAutomation = ({
  aiIndex,
  isManaged,
  onSaved,
}: UseSuggestAutomationParams): UseSuggestAutomationResult => {
  const {
    services: { agentBuilder, application },
  } = useKibana();

  const onSavedRef = useRef(onSaved);
  const aiIndexIdRef = useRef(aiIndex?.id);
  useLayoutEffect(() => {
    onSavedRef.current = onSaved;
    aiIndexIdRef.current = aiIndex?.id;
  });

  const hasAgentBuilderPrivilege =
    application.capabilities[AGENT_BUILDER_CAPABILITY]?.show === true;

  const canSuggest = useMemo(
    () =>
      aiIndex !== undefined &&
      !isManaged &&
      hasAgentBuilderPrivilege &&
      agentBuilder?.openChat !== undefined,
    [agentBuilder, aiIndex, hasAgentBuilderPrivilege, isManaged]
  );

  useEffect(() => {
    if (!canSuggest || !agentBuilder?.events) {
      return;
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

        const currentAiIndexId = aiIndexIdRef.current;
        if (!currentAiIndexId) {
          return;
        }

        if (
          !successfulResults.some(
            (result) => getAutomationToolAiIndexId(result) === currentAiIndexId
          )
        ) {
          return;
        }

        onSavedRef.current();
      });

    return () => subscription.unsubscribe();
  }, [agentBuilder, canSuggest]);

  const suggestAutomation = useCallback(() => {
    if (!canSuggest || !aiIndex || !agentBuilder?.openChat) {
      return;
    }

    agentBuilder.openChat({
      newConversation: true,
      initialMessage: SUGGEST_AUTOMATION_INITIAL_MESSAGE,
      sessionTag: `context-engine-ai-index-${aiIndex.id}`,
      attachments: [
        {
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
        },
      ],
    });
  }, [agentBuilder, aiIndex, canSuggest]);

  return { canSuggest, suggestAutomation };
};
