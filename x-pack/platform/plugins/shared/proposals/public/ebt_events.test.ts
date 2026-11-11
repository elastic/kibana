/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, AnalyticsServiceStart } from '@kbn/core/public';
import {
  PROPOSALS_EBT_EVENTS,
  registerProposalsEbtEvents,
  reportProposalDecided,
} from './ebt_events';

describe('proposals EBT events', () => {
  it('registers the proposal_decided event type', () => {
    const registerEventType = jest.fn();

    registerProposalsEbtEvents({ registerEventType } as unknown as AnalyticsServiceSetup);

    expect(registerEventType).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: PROPOSALS_EBT_EVENTS.PROPOSAL_DECIDED })
    );
  });

  it('maps a decision to the event fields', () => {
    const reportEvent = jest.fn();

    reportProposalDecided({ reportEvent } as unknown as AnalyticsServiceStart, {
      proposalId: 'p1',
      decision: 'decline',
      surface: 'flyout',
      origin: 'alertzero',
      conversationId: 'conv-1',
      investigationId: 'inv-1',
      dismissReason: 'duplicate',
      confidence: 'high',
      impact: 'low',
    });

    expect(reportEvent).toHaveBeenCalledWith('proposal_decided', {
      proposal_id: 'p1',
      decision: 'decline',
      surface: 'flyout',
      origin: 'alertzero',
      conversation_id: 'conv-1',
      investigation_id: 'inv-1',
      dismiss_reason: 'duplicate',
      confidence: 'high',
      impact: 'low',
    });
  });
});
