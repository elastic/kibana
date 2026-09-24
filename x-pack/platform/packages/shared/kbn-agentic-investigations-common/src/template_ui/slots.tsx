/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Conversation } from '@kbn/agent-builder-common';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import {
  ConversationDetailsFlyoutHeader,
  ConversationDetailsFlyoutFooter,
  EscalationFlyoutHeader,
  type ConversationDetailsFlyoutFooterProps,
  OverviewTab,
} from '../components/details';
import {
  conversationToInvestigation,
  conversationToEscalationHeader,
} from './conversation_to_investigation';
import type { RenderAssignees, RenderStatus } from './types';

/**
 * The investigation flyout's slot contents, kept in one module so `register` can pull them in a
 * single lazy chunk instead of shipping them in each consuming plugin's page load bundle.
 *
 * Every slot derives its investigation from the conversation Agent Builder passes in. The
 * derivation is synchronous, so no slot loads, fails, or renders a skeleton.
 */
interface InvestigationSlotProps {
  conversation: Conversation;
  refetchConversation?: () => Promise<void>;
}

export interface OverviewSlotProps extends InvestigationSlotProps {
  /**
   * Captured at registration: the flyout can mount outside a `KibanaContextProvider`, so the
   * attachment registry cannot be reached from ambient context.
   */
  attachmentsService: AttachmentServiceStartContract;
}

export const OverviewSlot = ({ conversation, attachmentsService }: OverviewSlotProps) => (
  <OverviewTab
    investigation={conversationToInvestigation(conversation)}
    attachments={conversation.attachments}
    attachmentsService={attachmentsService}
  />
);

export interface HeaderSlotProps extends InvestigationSlotProps {
  renderAssignees?: RenderAssignees;
  renderStatus?: RenderStatus;
}

export const HeaderSlot = ({
  conversation,
  renderAssignees,
  renderStatus,
  refetchConversation,
}: HeaderSlotProps) => {
  const investigation = conversationToInvestigation(conversation);
  const assigneesNode = renderAssignees
    ? renderAssignees({
        conversationId: conversation.id,
        templateId: 'investigation',
        assigneeUids: investigation.assignees,
        status: investigation.status,
        refetchConversation,
      })
    : undefined;
  const statusNode = renderStatus
    ? renderStatus({
        conversationId: conversation.id,
        templateId: 'investigation',
        status: investigation.status,
        refetchConversation,
      })
    : undefined;
  return (
    <ConversationDetailsFlyoutHeader
      investigation={investigation}
      assigneesNode={assigneesNode}
      statusNode={statusNode}
    />
  );
};

export interface FooterSlotProps extends InvestigationSlotProps {
  onOpenChat: () => void;
  onOpenEscalation?: ConversationDetailsFlyoutFooterProps['onOpenEscalation'];
  onCloseInvestigation?: ConversationDetailsFlyoutFooterProps['onCloseInvestigation'];
}

export const FooterSlot = ({
  conversation,
  onOpenChat,
  onOpenEscalation,
  onCloseInvestigation,
}: FooterSlotProps) => (
  <ConversationDetailsFlyoutFooter
    investigation={conversationToInvestigation(conversation)}
    onOpenChat={onOpenChat}
    onOpenEscalation={onOpenEscalation}
    onCloseInvestigation={onCloseInvestigation}
  />
);

// ---------------------------------------------------------------------------
// Escalation header slot
// ---------------------------------------------------------------------------

export interface EscalationHeaderSlotProps {
  conversation: Conversation;
  refetchConversation?: () => Promise<void>;
  renderAssignees?: RenderAssignees;
  renderStatus?: RenderStatus;
}

export const EscalationHeaderSlot = ({
  conversation,
  renderAssignees,
  renderStatus,
  refetchConversation,
}: EscalationHeaderSlotProps) => {
  const { status, assigneeUids } = conversationToEscalationHeader(conversation);

  const assigneesNode = renderAssignees
    ? renderAssignees({
        conversationId: conversation.id,
        templateId: 'escalation',
        assigneeUids,
        status,
        refetchConversation,
      })
    : undefined;

  const statusNode = renderStatus
    ? renderStatus({
        conversationId: conversation.id,
        templateId: 'escalation',
        status,
        refetchConversation,
      })
    : undefined;

  return (
    <EscalationFlyoutHeader
      title={conversation.title}
      createdAt={conversation.created_at}
      status={status}
      assigneeUids={assigneeUids}
      assigneesNode={assigneesNode}
      statusNode={statusNode}
    />
  );
};
