/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Conversation } from '@kbn/agent-builder-common';
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

export const OverviewSlot = ({ conversation }: InvestigationSlotProps) => (
  <OverviewTab investigation={conversationToInvestigation(conversation)} />
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
