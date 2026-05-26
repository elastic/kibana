/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { EmbeddableConversationsProvider } from '../../application/context/conversation/embeddable_conversations_provider';
import { EmbeddableAccessBoundary } from '../../embeddable/embeddable_access_boundary';
import { Conversation } from '../../application/components/conversations/conversation';
import { conversationBackgroundStyles } from '../../application/components/conversations/conversation.styles';
import { storageKeys } from '../../application/storage_keys';
import type { AgentBuilderInternalService } from '../../services';
import type { CoreStart } from '@kbn/core/public';

const PLATFORM_CASE_ATTACHMENT_TYPE = 'platform.core.cases.case';

const CASE_ATTACHMENT_PROMPT = i18n.translate(
  'xpack.agentBuilder.caseAiWorkspace.caseAttachmentPrompt',
  {
    defaultMessage:
      'Help me investigate this case. Review linked alerts, observables, and comments. Summarize the current status and suggest next steps.',
  }
);

export interface CaseConversationPanelProps {
  services: AgentBuilderInternalService;
  coreStart: CoreStart;
  caseId: string;
  caseOwner: string;
  caseTitle: string;
  caseDescription?: string;
  projectId: string;
  sessionTag: string;
  conversationId?: string;
  isNewConversation: boolean;
}

export const CaseConversationPanel: React.FC<CaseConversationPanelProps> = ({
  services,
  coreStart,
  caseId,
  caseOwner,
  caseTitle,
  caseDescription,
  projectId,
  sessionTag,
  conversationId,
  isNewConversation,
}) => {
  const { euiTheme } = useEuiTheme();

  const attachments = useMemo((): AttachmentInput[] => {
    return [
      {
        id: `case-${caseId}`,
        type: PLATFORM_CASE_ATTACHMENT_TYPE,
        data: {
          case_id: caseId,
          owner: caseOwner,
          title: caseTitle,
          description: caseDescription,
          attachmentLabel: caseTitle,
        },
      },
    ];
  }, [caseId, caseOwner, caseTitle, caseDescription]);

  useEffect(() => {
    const storageKey = storageKeys.getLastConversationKey(sessionTag, agentBuilderDefaultAgentId);
    if (conversationId) {
      window.localStorage.setItem(storageKey, JSON.stringify(conversationId));
    } else if (isNewConversation) {
      window.localStorage.removeItem(storageKey);
    }
  }, [conversationId, isNewConversation, sessionTag]);

  const panelStyles = css`
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 480px;
    ${conversationBackgroundStyles(euiTheme)}
  `;

  const bodyStyles = css`
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `;

  return (
    <div css={panelStyles} data-test-subj="caseAiWorkspaceConversation">
      <EmbeddableConversationsProvider
        coreStart={coreStart}
        services={services}
        sessionTag={sessionTag}
        agentId={agentBuilderDefaultAgentId}
        caseId={caseId}
        caseOwner={caseOwner}
        caseTitle={caseTitle}
        projectId={projectId}
        newConversation={isNewConversation}
        initialMessage={isNewConversation ? CASE_ATTACHMENT_PROMPT : undefined}
        autoSendInitialMessage={false}
        attachments={attachments}
        ariaLabelledBy="case-ai-workspace-conversation"
      >
        <EmbeddableAccessBoundary>
          <div css={bodyStyles}>
            <Conversation />
          </div>
        </EmbeddableAccessBoundary>
      </EmbeddableConversationsProvider>
    </div>
  );
};
