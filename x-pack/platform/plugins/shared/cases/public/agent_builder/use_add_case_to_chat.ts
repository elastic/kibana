/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { EMPTY, filter, switchMap } from 'rxjs';
import { isToolUiEvent, type ChatEvent, type ToolUiEvent } from '@kbn/agent-builder-common';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { ApplicationStart } from '@kbn/core-application-browser';
import { useQueryClient } from '@kbn/react-query';
import type { CaseUI } from '../../common';
import {
  CASE_ATTACHMENT_TYPE,
  type CaseAttachmentData,
} from '../../common/types/agent_builder/attachment_schemas';
import {
  CASES_UPDATED_UI_EVENT,
  type CasesUpdatedUiEventData,
} from '../../common/types/agent_builder/ui_events';
import { useCasesConfig, useKibana } from '../common/lib/kibana';
import { casesQueriesKeys } from '../containers/constants';
import { getCaseUrls } from './attachments/route_helpers';
import { SUMMARIZE_CASE_PROMPT } from './translations';
import { useAgentBuilderAvailability } from './use_agent_builder_availability';

export const getCaseAttachmentData = (
  theCase: CaseUI,
  application: ApplicationStart
): CaseAttachmentData => {
  const data: CaseAttachmentData = {
    id: theCase.id,
    incremental_id: theCase.incrementalId ?? null,
    title: theCase.title,
    description: theCase.description,
    status: theCase.status,
    severity: theCase.severity,
    totalAlerts: theCase.totalAlerts,
    totalComment: theCase.totalComment,
    tags: theCase.tags,
    owner: theCase.owner as CaseAttachmentData['owner'],
    assignees: theCase.assignees ?? [],
    category: theCase.category ?? null,
    created_at: theCase.createdAt,
    updated_at: theCase.updatedAt ?? null,
    total_observables: theCase.totalObservables ?? null,
    totalAttachments: theCase.comments.length,
    connector_name: theCase.connector.name ?? null,
  };

  return {
    ...data,
    url: getCaseUrls({ application, data }).case,
  };
};

export const getCaseAttachment = (
  theCase: CaseUI,
  application: ApplicationStart
): AttachmentInput<typeof CASE_ATTACHMENT_TYPE, CaseAttachmentData> => ({
  id: `${CASE_ATTACHMENT_TYPE}:${theCase.id}`,
  type: CASE_ATTACHMENT_TYPE,
  data: getCaseAttachmentData(theCase, application),
});

const isCasesUpdatedUiEvent = (
  event: ChatEvent
): event is ToolUiEvent<typeof CASES_UPDATED_UI_EVENT, CasesUpdatedUiEventData> =>
  isToolUiEvent(event, CASES_UPDATED_UI_EVENT);

export const useAddCaseToChat = (theCase: CaseUI) => {
  const {
    services: { agentBuilder, application },
  } = useKibana();
  const queryClient = useQueryClient();
  const { chatEnabled } = useCasesConfig();
  const { isAgentBuilderAvailable } = useAgentBuilderAvailability();

  const isAddToChatAvailable =
    chatEnabled && isAgentBuilderAvailable && Boolean(agentBuilder?.openChat);

  useEffect(() => {
    if (!chatEnabled || !isAgentBuilderAvailable || !agentBuilder?.events) {
      return;
    }

    const subscription = agentBuilder.events.ui.activeConversation$
      .pipe(
        switchMap((conversation) =>
          conversation?.id ? agentBuilder.events.getChatEvents$(conversation.id) : EMPTY
        ),
        filter(isCasesUpdatedUiEvent)
      )
      .subscribe((event) => {
        if (event.data.data.caseIds.includes(theCase.id)) {
          queryClient.invalidateQueries(casesQueriesKeys.case(theCase.id));
          queryClient.invalidateQueries(casesQueriesKeys.tags());
          queryClient.invalidateQueries(casesQueriesKeys.categories());
        }
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [agentBuilder, chatEnabled, isAgentBuilderAvailable, queryClient, theCase.id]);

  const addToChat = useCallback(() => {
    if (!isAddToChatAvailable || !agentBuilder?.openChat) {
      return;
    }

    agentBuilder.openChat({
      autoSendInitialMessage: false,
      newConversation: true,
      attachments: [getCaseAttachment(theCase, application)],
    });
  }, [agentBuilder, application, isAddToChatAvailable, theCase]);

  const summarizeCase = useCallback(() => {
    if (!isAddToChatAvailable || !agentBuilder?.openChat) {
      return;
    }

    agentBuilder.openChat({
      autoSendInitialMessage: false,
      newConversation: true,
      initialMessage: SUMMARIZE_CASE_PROMPT,
      attachments: [getCaseAttachment(theCase, application)],
    });
  }, [agentBuilder, application, isAddToChatAvailable, theCase]);

  return useMemo(
    () => ({
      addToChat,
      summarizeCase,
      isAddToChatAvailable,
    }),
    [addToChat, summarizeCase, isAddToChatAvailable]
  );
};
