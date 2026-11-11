/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSyncExternalStore } from 'react';

import type { ContextSwitcherVariant } from '@kbn/context-switcher-components';

const STORAGE_KEY = 'kbn.contextSwitcherProposal';
const PROPOSAL_CHANGE_EVENT = 'kbn.contextSwitcherProposalChange';

const isProposal = (value: string | null): value is ContextSwitcherVariant =>
  value === 'original' || value === 'proposal1' || value === 'proposal2' || value === 'proposal3';

const readStoredProposal = (): ContextSwitcherVariant => {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (isProposal(stored)) {
      return stored;
    }
  } catch {
    // sessionStorage can be unavailable.
  }
  return 'proposal1';
};

const listeners = new Set<() => void>();
let proposal: ContextSwitcherVariant | undefined;

export const getContextSwitcherProposal = (): ContextSwitcherVariant => {
  if (!proposal) {
    proposal = readStoredProposal();
  }
  return proposal;
};

export const setContextSwitcherProposal = (next: ContextSwitcherVariant) => {
  if (next === proposal) {
    return;
  }
  proposal = next;
  try {
    sessionStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Ignore write failures. The in-memory value still updates.
  }
  listeners.forEach((listener) => listener());
  window.dispatchEvent(new CustomEvent(PROPOSAL_CHANGE_EVENT, { detail: next }));
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useContextSwitcherProposal = (): ContextSwitcherVariant =>
  useSyncExternalStore(subscribe, getContextSwitcherProposal, () => 'proposal1');
