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
  type ConversationDetailsFlyoutFooterProps,
  OverviewTab,
} from '../components/details';
import { conversationToInvestigation } from './conversation_to_investigation';

/**
 * The investigation flyout's slot contents, kept in one module so `register` can pull them in a
 * single lazy chunk instead of shipping them in each consuming plugin's page load bundle.
 *
 * Every slot derives its investigation from the conversation Agent Builder passes in. The
 * derivation is synchronous, so no slot loads, fails, or renders a skeleton.
 */
interface InvestigationSlotProps {
  conversation: Conversation;
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

export const HeaderSlot = ({ conversation }: InvestigationSlotProps) => (
  <ConversationDetailsFlyoutHeader investigation={conversationToInvestigation(conversation)} />
);

export interface FooterSlotProps extends InvestigationSlotProps {
  onOpenChat: () => void;
  onOpenEscalation?: ConversationDetailsFlyoutFooterProps['onOpenEscalation'];
}

export const FooterSlot = ({ conversation, onOpenChat, onOpenEscalation }: FooterSlotProps) => (
  <ConversationDetailsFlyoutFooter
    investigation={conversationToInvestigation(conversation)}
    onOpenChat={onOpenChat}
    onOpenEscalation={onOpenEscalation}
  />
);
