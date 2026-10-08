/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { Conversation } from '@kbn/agent-builder-common';
import {
  ConversationDetailsFlyoutHeader,
  ConversationDetailsFlyoutFooter,
  EscalationFlyoutHeader,
  type ConversationDetailsFlyoutFooterProps,
  OverviewTab,
} from '../components/details';
import { ImpactSection } from '../components/details/impact_section';
import type { FlyoutGroupedAttachmentsRegistry } from '../components/grouped_attachments';
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
  groupedAttachments: FlyoutGroupedAttachmentsRegistry;
  /**
   * Renders the "Proposed actions" section's content. Called with the conversation's own id so a
   * host can fetch its proposals; omitted entirely (see `OverviewTab`) when the caller has none.
   */
  renderProposedActions?: (props: { conversationId: string }) => React.ReactNode;
  /** Renders a count shown beside the "Proposed actions" heading. */
  renderProposedActionsCount?: (props: { conversationId: string }) => React.ReactNode;
}

export const OverviewSlot = ({
  conversation,
  groupedAttachments,
  renderProposedActions,
  renderProposedActionsCount,
}: OverviewSlotProps) => (
  <OverviewTab
    investigation={conversationToInvestigation(conversation)}
    attachments={conversation.attachments}
    groupedAttachments={groupedAttachments}
    proposedActionsContent={renderProposedActions?.({ conversationId: conversation.id })}
    proposedActionsCount={renderProposedActionsCount?.({ conversationId: conversation.id })}
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
  isOpenedFromChat: boolean;
  onOpenChat: () => void;
  onOpenEscalation?: ConversationDetailsFlyoutFooterProps['onOpenEscalation'];
  wrapEscalationButton?: ConversationDetailsFlyoutFooterProps['wrapEscalationButton'];
  onCloseInvestigation?: ConversationDetailsFlyoutFooterProps['onCloseInvestigation'];
}

export const FooterSlot = ({
  isOpenedFromChat,
  conversation,
  onOpenChat,
  onOpenEscalation,
  wrapEscalationButton,
  onCloseInvestigation,
}: FooterSlotProps) => (
  <ConversationDetailsFlyoutFooter
    investigation={conversationToInvestigation(conversation)}
    isOpenedFromChat={isOpenedFromChat}
    onOpenChat={onOpenChat}
    onOpenEscalation={onOpenEscalation}
    wrapEscalationButton={wrapEscalationButton}
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
 * `renderLinkedInvestigations` (supplied by the consuming plugin so it can use HTTP hooks), then
 * the Impact copied over from the linked investigations.
 */
export const EscalationOverviewSlot = ({
  conversation,
  renderLinkedInvestigations,
  onOpenInvestigation,
}: EscalationOverviewSlotProps) => {
  const { linkedInvestigationIds } = conversationToEscalationHeader(conversation);

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {renderLinkedInvestigations && (
        <EuiFlexItem>
          {renderLinkedInvestigations({
            escalationId: conversation.id,
            linkedInvestigationIds,
            onOpenInvestigation,
          })}
        </EuiFlexItem>
      )}
      <ImpactSection attachments={conversation.attachments} />
    </EuiFlexGroup>
  );
};
