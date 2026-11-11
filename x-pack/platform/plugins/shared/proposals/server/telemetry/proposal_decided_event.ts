/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, AnalyticsServiceStart, Logger } from '@kbn/core/server';
import type { Proposal } from '@kbn/proposals-common';

export const PROPOSAL_DECIDED_EVENT_TYPE = 'proposal_decided';

interface ProposalDecidedEventProps {
  proposal_id: string;
  decision: string;
  decision_mode?: string;
  status: string;
  gate?: string;
  origin?: string;
  conversation_id: string;
  dismiss_reason?: string;
  confidence?: string;
  impact?: string;
}

/** Registers the proposals EBT event types. Call once, from the plugin's `setup`. */
export const registerProposalsEbtEvents = (analytics: AnalyticsServiceSetup): void => {
  analytics.registerEventType<ProposalDecidedEventProps>({
    eventType: PROPOSAL_DECIDED_EVENT_TYPE,
    schema: {
      proposal_id: { type: 'keyword', _meta: { description: 'Id of the proposal.' } },
      decision: {
        type: 'keyword',
        _meta: { description: 'What was decided: approved or dismissed.' },
      },
      decision_mode: {
        type: 'keyword',
        _meta: {
          description: 'How it was decided: manual when someone answered, auto when nobody did.',
          optional: true,
        },
      },
      status: {
        type: 'keyword',
        _meta: { description: 'Status the proposal moved to with the decision.' },
      },
      gate: {
        type: 'keyword',
        _meta: {
          description: 'Whether a gate workflow (workflow) or nothing (none) held the proposal.',
          optional: true,
        },
      },
      origin: {
        type: 'keyword',
        _meta: {
          description: 'Product that created the proposal, for example alertzero or nightshift.',
          optional: true,
        },
      },
      conversation_id: {
        type: 'keyword',
        _meta: { description: 'Conversation the proposal was created in.' },
      },
      dismiss_reason: {
        type: 'keyword',
        _meta: { description: 'Reason picked when dismissing.', optional: true },
      },
      confidence: {
        type: 'keyword',
        _meta: { description: 'Confidence the proposer gave the proposal.', optional: true },
      },
      impact: {
        type: 'keyword',
        _meta: { description: 'Impact the proposer gave the proposal.', optional: true },
      },
    },
  });
};

/**
 * Reports a decision the service has just written. The decision rationale and the free-form
 * category are customer-authored text and are never reported. Telemetry must not fail a decision
 * that already landed, so a throwing reporter is logged and swallowed.
 */
export const reportProposalDecided = (
  analytics: AnalyticsServiceStart,
  logger: Logger,
  proposal: Pick<
    Proposal,
    | 'id'
    | 'decision'
    | 'decisionMode'
    | 'status'
    | 'gate'
    | 'origin'
    | 'conversationId'
    | 'dismissReason'
    | 'confidence'
    | 'impact'
  >
): void => {
  if (proposal.decision === undefined) return;
  try {
    analytics.reportEvent<ProposalDecidedEventProps>(PROPOSAL_DECIDED_EVENT_TYPE, {
      proposal_id: proposal.id,
      decision: proposal.decision,
      decision_mode: proposal.decisionMode,
      status: proposal.status,
      gate: proposal.gate,
      origin: proposal.origin,
      conversation_id: proposal.conversationId,
      dismiss_reason: proposal.dismissReason,
      confidence: proposal.confidence,
      impact: proposal.impact,
    });
  } catch (error) {
    logger.debug(
      `Failed to report the proposal decision: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
