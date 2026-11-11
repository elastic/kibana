/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DismissReason, Proposal } from '@kbn/proposals-common';

/** Where in the UI a proposed action was decided. */
export type ProposalDecisionSurface = 'flyout' | 'hypothesis_tree';

export type ProposalDecisionKind = 'approve' | 'decline' | 'reopen';

/** A proposed action decision that the server accepted. */
export interface ProposalDecidedEvent {
  proposalId: string;
  decision: ProposalDecisionKind;
  surface: ProposalDecisionSurface;
  /** Only set where the surface knows the investigation, which the chat card does not. */
  investigationId?: string;
  conversationId?: string;
  dismissReason?: DismissReason;
  category?: Proposal['category'];
  confidence?: Proposal['confidence'];
  impact?: Proposal['impact'];
}

export type ProposalDecidedListener = (event: ProposalDecidedEvent) => void;

const listeners = new Set<ProposalDecidedListener>();

/** Subscribes to accepted decisions; returns the unsubscribe function. */
export const addProposalDecidedListener = (listener: ProposalDecidedListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Tells every listener; one that throws never breaks the decision or the other listeners. */
export const notifyProposalDecided = (event: ProposalDecidedEvent): void => {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch {
      // Telemetry must not affect a decision that already went through.
    }
  });
};
