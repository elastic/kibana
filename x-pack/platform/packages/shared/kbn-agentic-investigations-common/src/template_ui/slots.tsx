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
import type { RenderAssignees, RenderStatus, RenderLinkedInvestigations } from './types';

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
  /**
   * Renders the "Proposed actions" section's content. Called with the conversation's own id so a
   * host can fetch its proposals; omitted entirely (see `OverviewTab`) when the caller has none.
   */
  renderProposedActions?: (props: { conversationId: string }) => React.ReactNode;
}

export const OverviewSlot = ({
  conversation,
  attachmentsService,
  renderProposedActions,
}: OverviewSlotProps) => (
  <OverviewTab
    investigation={conversationToInvestigation(conversation)}
    attachments={conversation.attachments}
    attachmentsService={attachmentsService}
    proposedActionsContent={renderProposedActions?.({ conversationId: conversation.id })}
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

// ---------------------------------------------------------------------------
// Escalation overview slot (body tab)
// ---------------------------------------------------------------------------

export interface EscalationOverviewSlotProps {
  conversation: Conversation;
  renderLinkedInvestigations?: RenderLinkedInvestigations;
  onOpenInvestigation: (args: { conversationId: string; agentId: string }) => void;
}

/**
 * The body tab for the escalation details flyout. Renders the linked investigations list via
 * `renderLinkedInvestigations` (supplied by the consuming plugin so it can use HTTP hooks).
 * Returns `null` when no render prop is provided.
 */
export const EscalationOverviewSlot = ({
  conversation,
  renderLinkedInvestigations,
  onOpenInvestigation,
}: EscalationOverviewSlotProps) => {
  if (!renderLinkedInvestigations) return null;

  const { linkedInvestigationIds } = conversationToEscalationHeader(conversation);

  return (
    <>
      {renderLinkedInvestigations({
        escalationId: conversation.id,
        linkedInvestigationIds,
        onOpenInvestigation,
      })}
    </>
  );
};
