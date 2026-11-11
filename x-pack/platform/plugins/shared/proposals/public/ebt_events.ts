/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, AnalyticsServiceStart } from '@kbn/core/public';
import type { DismissReason, Proposal, ProposalOrigin } from '@kbn/proposals-common';

export const PROPOSALS_EBT_EVENTS = {
  /** The user approved, declined or reopened a proposed action, and the server accepted it. */
  PROPOSAL_DECIDED: 'proposal_decided',
} as const;

/** Where in the UI a proposed action was decided. */
export type ProposalDecisionSurface = 'chat' | 'flyout' | 'hypothesis_tree';

export type ProposalDecisionKind = 'approve' | 'decline' | 'reopen';

/** A proposed action decision that the server accepted. */
export interface ProposalDecidedEvent {
  proposalId: string;
  decision: ProposalDecisionKind;
  surface: ProposalDecisionSurface;
  /** Only set where the surface knows the investigation, which the chat card and flyout do not. */
  investigationId?: string;
  conversationId?: string;
  /** Which product created the proposal, so decisions can be told apart per product. */
  origin?: ProposalOrigin;
  dismissReason?: DismissReason;
  confidence?: Proposal['confidence'];
  impact?: Proposal['impact'];
}

interface ProposalDecidedProps {
  proposal_id: string;
  decision: ProposalDecisionKind;
  surface: ProposalDecisionSurface;
  origin?: string;
  investigation_id?: string;
  conversation_id?: string;
  dismiss_reason?: string;
  confidence?: string;
  impact?: string;
}

/** Registers the proposals EBT event types. Call once, from the plugin's `setup`. */
export const registerProposalsEbtEvents = (analytics: AnalyticsServiceSetup): void => {
  analytics.registerEventType<ProposalDecidedProps>({
    eventType: PROPOSALS_EBT_EVENTS.PROPOSAL_DECIDED,
    schema: {
      proposal_id: { type: 'keyword', _meta: { description: 'Id of the proposed action.' } },
      decision: {
        type: 'keyword',
        _meta: { description: 'What the user did: approve, decline or reopen.' },
      },
      surface: {
        type: 'keyword',
        _meta: { description: 'Where the decision was made: chat, flyout or hypothesis_tree.' },
      },
      origin: {
        type: 'keyword',
        _meta: {
          description: 'Product that created the proposal, for example alertzero or nightshift.',
          optional: true,
        },
      },
      investigation_id: {
        type: 'keyword',
        _meta: {
          description: 'Investigation the proposed action belongs to, when the surface knows it.',
          optional: true,
        },
      },
      conversation_id: {
        type: 'keyword',
        _meta: { description: 'Conversation the proposed action was created in.', optional: true },
      },
      dismiss_reason: {
        type: 'keyword',
        _meta: { description: 'Reason picked when declining.', optional: true },
      },
      confidence: {
        type: 'keyword',
        _meta: { description: 'Confidence the proposer gave the action.', optional: true },
      },
      impact: {
        type: 'keyword',
        _meta: { description: 'Impact the proposer gave the action.', optional: true },
      },
    },
  });
};

/**
 * Reports an accepted decision on a proposed action. The decline rationale and the free-form
 * proposal category are customer-authored text and are never reported.
 */
export const reportProposalDecided = (
  analytics: AnalyticsServiceStart,
  event: ProposalDecidedEvent
): void => {
  analytics.reportEvent<ProposalDecidedProps>(PROPOSALS_EBT_EVENTS.PROPOSAL_DECIDED, {
    proposal_id: event.proposalId,
    decision: event.decision,
    surface: event.surface,
    origin: event.origin,
    investigation_id: event.investigationId,
    conversation_id: event.conversationId,
    dismiss_reason: event.dismissReason,
    confidence: event.confidence,
    impact: event.impact,
  });
};
