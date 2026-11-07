/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Conversation } from '@kbn/agent-builder-common';
import { EscalationOverviewTab, OverviewTab } from '../components/details';
import type { FlyoutGroupedAttachmentsRegistry } from '../components/grouped_attachments';
import {
  conversationToInvestigation,
  conversationToEscalationHeader,
} from './conversation_to_investigation';
import type { RenderLinkedInvestigations, RenderOverview } from './types';

/**
 * The flyout tabs' contents, kept in one module so `register` can pull them in a single lazy chunk
 * instead of shipping them in each consuming plugin's page load bundle.
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
  /** Replaces the tab body; see `RenderOverview`. */
  renderOverview?: RenderOverview;
  /** Renders a count shown beside the "Proposed actions" heading. */
  renderProposedActionsCount?: (props: { conversationId: string }) => React.ReactNode;
}

export const OverviewSlot = ({
  conversation,
  groupedAttachments,
  renderProposedActions,
  renderOverview,
  renderProposedActionsCount,
}: OverviewSlotProps) => {
  const proposedActionsContent = renderProposedActions?.({ conversationId: conversation.id });
  const proposedActionsCount = renderProposedActionsCount?.({ conversationId: conversation.id });
  if (renderOverview) {
    return (
      <>
        {renderOverview({
          conversation,
          groupedAttachments,
          proposedActionsContent,
          proposedActionsCount,
        })}
      </>
    );
  }
  return (
    <OverviewTab
      investigation={conversationToInvestigation(conversation)}
      attachments={conversation.attachments}
      groupedAttachments={groupedAttachments}
      proposedActionsContent={proposedActionsContent}
      proposedActionsCount={proposedActionsCount}
    />
  );
};

// ---------------------------------------------------------------------------
// Escalation overview slot (body tab)
// ---------------------------------------------------------------------------

export interface EscalationOverviewSlotProps {
  conversation: Conversation;
  groupedAttachments: FlyoutGroupedAttachmentsRegistry;
  renderLinkedInvestigations?: RenderLinkedInvestigations;
  onOpenInvestigation: (args: { conversationId: string; agentId: string }) => void;
}

/**
 * The body tab for the escalation details flyout: the summary and grouped attachments, then the
 * linked investigations list via `renderLinkedInvestigations` (supplied by the consuming plugin so
 * it can use HTTP hooks), then the Impact copied over from the linked investigations. The list is
 * omitted when no render prop is provided.
 */
export const EscalationOverviewSlot = ({
  conversation,
  groupedAttachments,
  renderLinkedInvestigations,
  onOpenInvestigation,
}: EscalationOverviewSlotProps) => {
  const { linkedInvestigationIds, summary } = conversationToEscalationHeader(conversation);

  return (
    <EscalationOverviewTab
      summary={summary}
      attachments={conversation.attachments}
      groupedAttachments={groupedAttachments}
      linkedInvestigationsContent={renderLinkedInvestigations?.({
        escalationId: conversation.id,
        linkedInvestigationIds,
        onOpenInvestigation,
      })}
    />
  );
};
