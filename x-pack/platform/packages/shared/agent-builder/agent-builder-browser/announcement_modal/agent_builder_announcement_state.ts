/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Key intentionally omits the solution prefix (e.g. "securitySolution.") so that
// dismissing the modal in one solution marks it as seen across all solutions for
// that space. The key also changed from the previous "securitySolution." prefix when
// the default experience switched to Agent Builder, which resets the "seen" flag for
// all existing users so they receive the announcement.
const STORAGE_KEY = 'agentBuilder.announcementModal';

// Not a React hook — contains no hook calls. Named without `use` intentionally.
// Reads from localStorage on every call; state is owned by the caller.
export const getAgentBuilderAnnouncementState = (spaceId: string) => {
  const hasSeenModal = (): boolean => {
    try {
      return localStorage.getItem(`${STORAGE_KEY}.${spaceId}`) === 'true';
    } catch {
      return true;
    }
  };

  const markAsSeen = (): void => {
    try {
      localStorage.setItem(`${STORAGE_KEY}.${spaceId}`, 'true');
    } catch {
      // ignore storage errors
    }
  };

  return { hasSeenModal: hasSeenModal(), markAsSeen };
};
